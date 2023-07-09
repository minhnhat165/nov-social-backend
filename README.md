# NOV Social Backend

## Overview

This is the backend source code for the NOV Social social media platform. It is built using Node.js, Express, MongoDB, Redis, and other technologies. The backend is responsible for handling user authentication, managing data storage, and providing APIs for the frontend to communicate with.

## Technologies Used

The backend of the NOV Social platform utilizes the following technologies:

* Node.js: A JavaScript runtime environment.
* Express: A web application framework for Node.js.
* MongoDB: A document-oriented database for data storage.
* Redis: An in-memory data structure store for caching.
* Passport: A library for authentication.
* JSON Web Tokens (JWT): A method for securely transmitting information between parties as JSON objects.
* Cloudinary: A cloud-based image and video management service.
* Socket.io: A library for real-time communication between clients and servers.

## Prerequisites
Before running the backend server, make sure you have the following software installed on your machine:

 * Node.js 16.8 or later.
 * MongoDB.
 * Redis.

## Installation

1. Clone the repository:

```bash
git clone https://github.com/minhnhat165/nov-social-backend.git
```

2. Navigate to the project directory:

```bash
cd nov-social-backend
```

3. Install the dependencies:
```bash
yarn install
```

4. Set up environment variables:
* Make sure to set the values of these environment variables before running the app.
* Create a .env file in the root of the project.
* Define the following variables in the .env file:
  * `APP_NAME`: The name of the app.
  * `CLIENT_URL`: The URL of client site.
  * `MONGO_URI`: The URI for connecting to the MongoDB database.
  * `DB_USERNAME`: The username for MongoDB authentication.
  * `DB_PASSWORD`: The password for MongoDB authentication.
  * `REDIS_PORT`: The port number for the Redis server.
  * `REDIS_HOST`: The hostname for the Redis server.
  * `REDIS_PASSWORD`: The password for accessing the Redis server.
  * `EMAIL_HOST`: The hostname for the email server.
  * `EMAIL_PORT`: The port number for the email server.
  * `EMAIL_PASSWORD`: The password for the email server.
  * `ACCESS_TOKEN_SECRET`: The secret key for generating access tokens.
  * `VERIFY_TOKEN_SECRET`: The secret key for verifying tokens.
  * `REFRESH_TOKEN_SECRET`:  The secret key for refreshing tokens.
  * `GOOGLE_CLIENT_ID`: The client ID for Google authentication.
  * `GOOGLE_CLIENT_SECRET`: The client secret for Google authentication.
  * `GOOGLE_CALLBACK_URL`: The callback URL for Google authentication.
  * `FACEBOOK_APP_ID`: The app ID for Facebook authentication.
  * `FACEBOOK_APP_SECRET`: The app secret for Facebook authentication.
  * `CLOUDINARY_KEY`: The API key for accessing Cloudinary.
  * `CLOUDINARY_SECRET`: The API secret for accessing Cloudinary.
  * `CLOUDINARY_URL`: The URL for accessing Cloudinary.
```dotenv
# Example .env file
APP_NAME=Social Media Platform
CLIENT_URL=https://example.com
MONGO_URI=mongodb://localhost:27017/nov_social
DB_USERNAME=your-username
DB_PASSWORD=your-password
REDIS_PORT=6379
REDIS_HOST=localhost
REDIS_PASSWORD=your-redis-password
EMAIL_HOST=your-email-host
EMAIL_PORT=587
EMAIL_PASSWORD=your-email-password
ACCESS_TOKEN_SECRET=your-access-token-secret
VERIFY_TOKEN_SECRET=your-verify-token-secret
REFRESH_TOKEN_SECRET=your-refresh-token-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://example.com/auth/google/callback
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
CLOUDINARY_KEY=your-cloudinary-api-key
CLOUDINARY_SECRET=your-cloudinary-api-secret
CLOUDINARY_URL=https://api.cloudinary.com/v1_1/your-cloudinary-cloud-name
```
5. Run in development mode

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```
The server will start running on `http://localhost:8080`.

## API Documentation
The API documentation will upload later.

## Contributing
* [Nguyễn Minh Nhật](https://github.com/minhnhat165)
  
## License

[MIT](https://choosealicense.com/licenses/mit/)
