"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

exports.sendRideRequestNotification = functions.database
  .ref(
    "/ridesRequests/{groupId}/{rideId}/{toUserId}/{fromUserId}/{rideRequestId}"
  )
  .onWrite(event => {
    const {
      groupId,
      rideId,
      toUserId,
      fromUserId,
      rideRequestId
    } = event.params;

    console.log(
      "New ridesRequests for the group:",
      groupId,
      "for ride:",
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

    return Promise.all([getToUsersPromise, getFromProfile]).then(
      ([toUser, fromProfile]) => {
        const fromName = fromProfile.val().name;
        const payload = {
          notification: {
            title: "Pedido de carona",
            body: `${fromName} te pediu uma carona, clique para saber mais`,
            icon: "https://caronaboard.com/static/images/notification-icon.png",
            click_action: `https://caronaboard.com/#/groups/${groupId}/rides/${rideId}/requests/${fromUserId}/${rideRequestId}`
          }
        };

        const tokens = [toUser.val().notificationToken];

        // Send notifications to all tokens.
        return admin
          .messaging()
          .sendToDevice(tokens, payload)
          .then(clearTokenOnFail(tokens, [toUserId]));
      }
    );
  });

exports.sendJoinGroupRequestNotification = functions.database
  .ref("/joinGroupRequests/{groupId}/{fromUserId}/profile")
  .onWrite(event => {
    const { groupId, fromUserId } = event.params;

    console.log(
      "New joinRequest for the group:",
      groupId,
      "from user:",
      fromUserId
    );

    const getGroupAdmins = admin
      .database()
      .ref(`/groups/${groupId}/members`)
      .orderByChild("admin")
      .equalTo(true)
      .once("value");

    const getFromProfile = admin
      .database()
      .ref(`/profiles/${fromUserId}`)
      .once("value");

    return Promise.all([getGroupAdmins, getFromProfile]).then(
      ([admins, fromProfile]) => {
        const fromName = fromProfile.val().name;
        const payload = {
          notification: {
            title: "Pedido para entrar no grupo",
            body: `${fromName} te pediu uma carona, clique para saber mais`,
            icon: "https://caronaboard.com/static/images/notification-icon.png",
            click_action: `https://caronaboard.com/#/groups/${groupId}`
          }
        };

        const adminIds = Object.keys(admins.val());
        console.log("adminIds", adminIds);

        const adminsUsers = adminIds.map(id =>
          admin
            .database()
            .ref(`/users/${id}`)
            .once("value")
        );

        return Promise.all(adminsUsers).then(adminsUsers => {
          const tokens = adminsUsers
            .map(user => user.val() && user.val().notificationToken)
            .filter(a => a);
          console.log("Found tokens to send notification", tokens);

          const adminIds = adminsUsers
            .map(user => user.val() && user.key)
            .filter(a => a);
          console.log("adminIds2", adminIds);

          return admin
            .messaging()
            .sendToDevice(tokens, payload)
            .then(clearTokenOnFail(tokens, adminIds));
        });
      }
    );
  });

const clearTokenOnFail = (tokens, userIds) => response => {
  response.results.forEach((result, index) => {
    const error = result.error;
    if (error) {
      console.error("Failure sending notification to", tokens[index], error);
      if (
        error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered"
      ) {
        admin
          .database()
          .ref(`/users/${userIds[index]}/notificationToken`)
          .set(null);
      }
    } else {
      console.log("Successfully sent notification to", tokens[index]);
    }
  });
};
