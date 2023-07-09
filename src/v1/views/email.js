const emailHeader = `
<table
		role="presentation"
		cellspacing="0"
		cellpadding="0"
		width="100%"
		align="center"
		id="m_4653896774773498324logoContainer"
		style="
			background: #252f3d;
			border-radius: 3px 3px 0 0;
			max-width: 600px;
		"
	>
		<tbody>
			<tr>
				<td
					style="
						background: #2080c6;
						border-radius: 3px 3px 0 0;
						padding: 20px 0 10px 0;
						text-align: center;
					"
				>
					<h1
						style="
							color: white;
							font-family: 'Amazon Ember', 'Helvetica Neue',
								Roboto, Arial, sans-serif;
						"
					>
						${process.env.APP_NAME}
					</h1>
				</td>
			</tr>
		</tbody>
	</table>
`;

const emailFooter = `<table
		role="presentation"
		cellspacing="0"
		cellpadding="0"
		width="100%"
		align="center"
		id="m_4653896774773498324footer"
		style="max-width: 600px"
	>
		<tbody>
			<tr>
				<td
					style="
						color: #777;
						font-family: 'Amazon Ember', 'Helvetica Neue', Roboto,
							Arial, sans-serif;
						font-size: 12px;
						line-height: 16px;
						padding: 20px 30px;
						text-align: center;
					"
				>
					This message was produced and distributed by ${process.env.APP_NAME},
					Inc., website
					<a
						href="https://bjdxkhre.r.us-east-1.awstrack.me/L0/https:%2F%2Fwww.amazon.com%2F/1/0100018595d6e524-a90b3fed-1398-4b8f-9ece-8e2bb455e281-000000/fxvzTsY7O1OAZ8Wl6rO-c9VGex0=303"
						target="_blank"
						>${process.env.APP_NAME}</a
					>.
				</td>
			</tr>
		</tbody>
	</table>`;

const generateEmailResetPassword = (code) => `
<div with="100%" style="margin: 0; background-color: #f0f2f3">
<div
   style="margin: auto; max-width: 600px; padding-top: 50px"
   class="m_4653896774773498324email-container"
   >
   <div
      style="margin: auto; max-width: 600px; padding-top: 50px"
      class="m_4653896774773498324email-container"
      >
      ${emailHeader}
      <table
         role="presentation"
         cellspacing="0"
         cellpadding="0"
         width="100%"
         align="center"
         id="m_4653896774773498324emailBodyContainer"
         style="border: 0px; border-bottom: 1px solid #d6d6d6; max-width: 600px"
         >
         <tbody>
            <tr>
               <td
                  style="
                  background-color: #fff;
                  color: #444;
                  font-family: 'Amazon Ember', 'Helvetica Neue', Roboto,
                  Arial, sans-serif;
                  font-size: 14px;
                  line-height: 140%;
                  padding: 25px 35px;
                  "
                  >
                  <h1
                     style="
                     font-size: 20px;
                     font-weight: bold;
                     line-height: 1.3;
                     margin: 0 0 15px 0;
                     "
                     >
                     Verify reset password
                  </h1>
                  <p style="margin: 0; padding: 0">
                     We received a request to reset the password for your
                     account. Please enter the following code to verify your
                     identity.
                  </p>
                  <p style="margin: 0; padding: 0"></p>
               </td>
            </tr>
            <tr>
               <td
                  style="
                  background-color: #fff;
                  color: #444;
                  font-family: 'Amazon Ember', 'Helvetica Neue', Roboto,
                  Arial, sans-serif;
                  font-size: 14px;
                  line-height: 140%;
                  padding: 25px 35px;
                  padding-top: 0;
                  text-align: center;
                  "
                  >
                  <div style="font-weight: bold; padding-bottom: 15px">
                     Verification code
                  </div>
                  <div
                     style="
                     color: #000;
                     font-size: 36px;
                     font-weight: bold;
                     padding-bottom: 15px;
                     "
                     >
                     ${code}
                  </div>
                  <div>(This code is valid for 5 minutes)</div>
               </td>
            </tr>
            <tr>
               <td
                  style="
                  background-color: #fff;
                  border-top: 1px solid #e0e0e0;
                  color: #777;
                  font-family: 'Amazon Ember', 'Helvetica Neue', Roboto,
                  Arial, sans-serif;
                  font-size: 14px;
                  line-height: 140%;
                  padding: 25px 35px;
                  "
                  >
                  <p style="margin: 0 0 15px 0; padding: 0 0 0 0">
                     ${process.env.APP_NAME} will never email you and ask you to disclose
                     or verify your password, credit card, or banking account
                     number.
                  </p>
               </td>
            </tr>
         </tbody>
      </table>
      ${emailFooter}
   </div>
</div>
  `;

const generateEmailVerify = (activeLink) => `
<div with="100%" style="margin: 0; background-color: #f0f2f3">
<div
   style="margin: auto; max-width: 600px; padding-top: 50px"
   class="m_4653896774773498324email-container"
   >
   <div
      style="margin: auto; max-width: 600px; padding-top: 50px"
      class="m_4653896774773498324email-container"
      >
      ${emailHeader}
      <table
			role="presentation"
			cellspacing="0"
			cellpadding="0"
			width="100%"
			align="center"
			id="m_4653896774773498324emailBodyContainer"
			style="
				border: 0px;
				border-bottom: 1px solid #d6d6d6;
				max-width: 600px;
			"
		>
			<tbody>
				<tr>
					<td
						style="
							background-color: #fff;
							color: #444;
							font-family: 'Amazon Ember', 'Helvetica Neue',
								Roboto, Arial, sans-serif;
							font-size: 14px;
							line-height: 140%;
							padding: 25px 35px;
						"
					>
						<h1
							style="
								font-size: 20px;
								font-weight: bold;
								line-height: 1.3;
								margin: 0 0 15px 0;
							"
						>
							Verify your email address
						</h1>
						<p style="margin: 0; padding: 0">
							Thanks for starting the new
							<span style="color: #2080c6">${process.env.APP_NAME}</span> account
							creation process. We want to make sure it's really
							you. Please click the button below to activate your
							account. If you don’t want to create an account, you
							can ignore this message.
						</p>
						<p style="margin: 0; padding: 0"></p>
					</td>
				</tr>
				<tr>
					<td
						style="
							background-color: #fff;
							color: #444;
							font-family: 'Amazon Ember', 'Helvetica Neue',
								Roboto, Arial, sans-serif;
							font-size: 14px;
							line-height: 140%;
							padding: 25px 35px;
							padding-top: 0;
							text-align: center;
						"
					>
						<a
							href="${activeLink}"
							style="
								font-family: Whitney, Helvetica Neue, Helvetica,
									Arial, Lucida Grande, sans-serif;
								background: #3588f2;
								text-decoration: none;
								color: white;
								padding: 12px 12px;
								margin: 10px 0;
								display: inline-block;
								border-radius: 8px;
								font-weight: bold;
								font-size: 16px;
							"
						>
							Activate account
						</a>
						<div>(Available in 24h)</div>
					</td>
				</tr>
				<tr>
					<td
						style="
							background-color: #fff;
							border-top: 1px solid #e0e0e0;
							color: #777;
							font-family: 'Amazon Ember', 'Helvetica Neue',
								Roboto, Arial, sans-serif;
							font-size: 14px;
							line-height: 140%;
							padding: 25px 35px;
						"
					>
						<p style="margin: 0 0 15px 0; padding: 0 0 0 0">
                ${process.env.APP_NAME} will never email you and ask you to disclose
                or verify your password, credit card, or banking account
                number.
            </p>
					</td>
				</tr>
			</tbody>
		</table>
      ${emailFooter}
   </div>
</div>
  `;

module.exports = {
	emailFooter,
	emailHeader,
	generateEmailVerify,
	generateEmailResetPassword,
};
