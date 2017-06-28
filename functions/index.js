"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

exports.sendRideRequestNotification = functions.database
  .ref("/ridesRequests/{rideId}/{toUserId}/{fromUserId}/{rideRequestId}")
  .onWrite(event => {
    const { rideId, toUserId, fromUserId, rideRequestId } = event.params;

    console.log(
      "New ridesRequests for the ride:",
      rideId,
      "for user:",
      fromUserId,
      "to user:",
      toUserId
    );

    const getToUsersPromise = admin
      .database()
      .ref(`/users/${toUserId}`)
      .once("value");

    const getFromProfile = admin
      .database()
      .ref(`/profiles/${fromUserId}`)
      .once("value");

    return Promise.all([
      getToUsersPromise,
      getFromProfile
    ]).then(([toUser, fromProfile]) => {
      const fromName = fromProfile.val().name;
      const payload = {
        notification: {
          title: "Pedido de carona",
          body: `${fromName} te pediu uma carona, clique para saber mais`,
          icon: "https://caronaboard.com/static/images/notification-icon.png",
          click_action: `https://caronaboard.com/#/ride-request/${rideId}/${fromUserId}/${rideRequestId}`
        }
      };

      const tokens = [toUser.val().notificationToken];

      // Send notifications to all tokens.
      return admin.messaging().sendToDevice(tokens, payload).then(response => {
        // For each message check if there was an error.
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            console.error(
              "Failure sending notification to",
              tokens[index],
              error
            );
            // Cleanup the tokens who are not registered anymore.
            if (
              error.code === "messaging/invalid-registration-token" ||
              error.code === "messaging/registration-token-not-registered"
            ) {
              toUser.ref("notificationToken").set(null);
            }
          }
        });
      });
    });
  });
