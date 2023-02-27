const Post = require('../models/Post');
const Hashtag = require('../models/Hashtag');
const createHttpError = require('http-errors');
const { deleteImages } = require('./cloud.service');
const createPost = async (post, user) => {
	const {
		content,
		photos,
		hashtags: hashtagNames = [],
		mentions,
		visibility,
		poll = null,
	} = post;

	const { _id } = user;
	const allHashtags = await handleHashtags(hashtagNames);
	const newPoll = await handlePoll(poll, user);

	const newPost = new Post({
		author: _id,
		content,
		photos,
		hashtags: allHashtags,
		mentions,
		visibility,
		poll: newPoll,
	});
	const savedPost = await newPost.save();
	await Hashtag.updateMany(
		{ _id: { $in: allHashtags } },
		{ $push: { posts: savedPost._id } },
	);
	return savedPost;
};

const updatePost = async (postId, post, user) => {
	const { content, photos, hashtags: hashtagNames, mentions, poll } = post;
	const { _id } = user;
	let dataUpdate = {};
	const updatePost = await Post.findById(postId);

	if (!updatePost) throw new createHttpError(404, 'Post not found');
	if (updatePost.author.toString() !== _id.toString())
		throw new createHttpError(403, 'Unauthorized');

	if (hashtagNames) {
		const newHashtags = await handleHashtags(hashtagNames);
		if (newHashtags.length > 0) dataUpdate.hashtags = newHashtags;
		// get old hashtags
		const oldHashtags = updatePost.hashtags || [];

		// hashtags that need to be removed
		const hashtagsToRemove = oldHashtags.filter(
			(hashtag) => !newHashtags.includes(hashtag),
		);

		//update post in hashtag
		await Hashtag.updateMany(
			{ _id: { $in: newHashtags } },
			{ $push: { posts: updatePost._id } },
		);
		await Hashtag.updateMany(
			{ _id: { $in: hashtagsToRemove } },
			{ $pull: { posts: updatePost._id } },
		);
	}

	if (content) dataUpdate.content = content;

	if (photos) {
		const oldPhotoIds = updatePost.photos.map((photo) => photo.publicId);
		const newPhotoIds = photos.map((photo) => photo.publicId);
		const photoIdsRemove = oldPhotoIds.filter(
			(photoId) => !newPhotoIds.includes(photoId),
		);
		deleteImages(photoIdsRemove);
		dataUpdate.photos = photos;
	}
	if (poll) {
		const newPoll = await handlePoll(poll, user);
		dataUpdate.poll = newPoll;
	}
	if (mentions) dataUpdate.mentions = mentions;
	const updatedPost = await Post.findByIdAndUpdate(postId, dataUpdate, {
		new: true,
	}).select(Object.keys(dataUpdate).join(' '));
	return updatedPost;
};

const deletePost = async (id, user) => {
	const post = await Post.findById(id);
	if (!post) throw new HttpError(404, 'Post not found');
	if (post.author.toString() !== user._id.toString())
		throw new createHttpError(403, 'Unauthorized');
	// remove post in hashtag
	const { hashtags, photos } = post;

	if (photos.length > 0) {
		const photoIds = photos.map((photo) => photo.publicId);
		deleteImages(photoIds);
	}

	if (hashtags.length > 0) {
		await Hashtag.updateMany(
			{ _id: { $in: hashtags } },
			{ $pull: { posts: post._id } },
		);
	}

	await post.remove();
	return true;
};

const handleHashtags = async (hashtagNames) => {
	if (hashtagNames.length === 0) return [];
	let allHashtags = [];
	const hashTagNamesLowercase = hashtagNames.map((name) =>
		name.toLowerCase(),
	);
	const existingHashtags = await Hashtag.find({
		name: { $in: hashTagNamesLowercase },
	});
	const existingHashtagIds = existingHashtags.map((hashtag) => hashtag._id);
	const newHashtags = hashTagNamesLowercase
		.filter(
			(name) =>
				!existingHashtags.some((hashtag) => hashtag.name === name),
		)
		.map((name) => new Hashtag({ name }));

	const savedHashtags = await Hashtag.insertMany(newHashtags);

	allHashtags = existingHashtagIds.concat(
		savedHashtags.map((hashtag) => hashtag._id),
	);
	return allHashtags;
};

const handlePoll = async (poll, user) => {
	if (!poll) return null;
	const { options } = poll;
	const newOptions = options.map((option) => {
		return {
			value: option.value,
			votes: 0,
			voters: [],
			createdBy: user._id,
		};
	});
	return { ...poll, options: newOptions };
};

const postService = {
	createPost,
	deletePost,
	updatePost,
};

module.exports = postService;
