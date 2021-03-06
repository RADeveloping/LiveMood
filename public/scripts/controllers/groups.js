let user;

/**
 * @desc Log user out of website and redirect to login page.
 */
function logout() {
    firebase.auth().signOut().then(function() {
        // Sign-out successful.
        window.location = "login.html";
    }).catch(function(error) {
        window.alert(error);
    })
}


/**
 * @desc Check user credentials, if not logged in, redirect to login.html. 
 */
function checkCred() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            window.location = "login.html";
        } else {
            init();
        }
    });
}
checkCred();

/**
 * @desc initialize user and call show groups and set username function.
 */
function init() {
    user = firebase.auth().currentUser;
    showGroups();
    setUserName();
}

/**
 * @desc set username for the page.
 */
function setUserName() {
    document.getElementById("username").innerText = user.displayName;

}
/**
 * @desc adds the onclick handlers to buttons
 */
function addOnClickHandlers() {
    document.getElementById("addnew").onclick = createGroup;
    document.getElementById("joingroup").onclick = joinGroup;
    document.getElementById("logoutButton").onclick = logout;


}
addOnClickHandlers();

/**
 * @desc creates a new group and adds data to Firebase Database.
 */

function createGroup() {
    bootbox.prompt({
        title: "Please enter a group name",
        inputType: 'text',
        centerVertical: true,
        buttons: {
            cancel: {
                label: '<i class="fa fa-times"></i> Cancel'
            },
            confirm: {
                label: '<i class="fa fa-check"></i> Create Group'
            }
        },
        callback: function(result) {

            if (result === null || result.length == 0) {

            } else {

                // Add a new document with a generated id.
                db.collection("groups").add({
                        name: result
                    })
                    .then(function(docRef) {
                        console.log("Document written with ID: ", docRef.id);

                        let groupRef = db.collection("users").doc(user.uid);
                        groupRef.update({
                            groups: firebase.firestore.FieldValue.arrayUnion(docRef.id)
                        });

                        let groupRefArray = db.collection("groups").doc(docRef.id);
                        groupRefArray.update({
                            users: firebase.firestore.FieldValue.arrayUnion(user.uid)
                        }).then(function() {
                            window.location.reload();
                        });

                    })
                    .catch(function(error) {
                        console.error("Error adding document: ", error);
                    });

            }

        }
    });

}


/**
 * @desc Checks firebase for valid group code and adds user to the group.
 */

function joinGroup() {
    bootbox.prompt({
        title: "Please paste your group code",
        inputType: 'text',
        centerVertical: true,
        buttons: {
            cancel: {
                label: '<i class="fa fa-times"></i> Cancel'
            },
            confirm: {
                label: '<i class="fa fa-check"></i> Join Group'
            }
        },
        callback: function(result) {

            if (result === null) {

            } else {

                let groupRefArray = db.collection("groups").doc(result);
                groupRefArray.get()
                    .then((docSnapshot) => {
                        if (docSnapshot.exists) {
                            groupRefArray.onSnapshot((doc) => {
                                // valid invite code
                                let groupRef = db.collection("users").doc(user.uid);
                                groupRef.update({
                                    groups: firebase.firestore.FieldValue.arrayUnion(result)
                                }).then(function() {
                                    groupRefArray.update({
                                        users: firebase.firestore.FieldValue.arrayUnion(user.uid)
                                    }).then(function() {
                                        window.location.reload();
                                    });
                                });
                            });
                        } else {
                            alert("Oops. That's not a valid invitation code!");
                        }
                    });
            }

        }
    });

}


/**
 * @desc Pulls all the groups from firebase and displays to user.
 */
function showGroups() {

    let groupsRef = db.collection("groups");
    var query = groupsRef.where("users", "array-contains", user.uid)
    query.get()
        .then(function(querySnapshot) {
            querySnapshot.forEach(function(doc) {
                if (doc.exists) {

                    console.log(doc.id)
                    let groupElement = document.getElementById("groupslist");

                    let divCard = document.createElement("li");
                    divCard.classList.add("list-group-item");

                    let a = document.createElement("a");
                    a.href = "#";
                    a.innerText = doc.data().name;
                    a.id = doc.id;
                    a.onclick = groupClicked;
                    divCard.append(a);
                    groupElement.appendChild(divCard);
                } else {
                    // doc.data() will be undefined in this case
                    console.log("No such document!");
                }

            });
        })
        .catch(function(error) {
            console.log("Error getting documents: ", error);
        });
}


/**
 * @desc Group button clicked, shows a popup menu with options. 
 */

function groupClicked(event) {

    let groupID = event.srcElement.id;
    let groupName = event.srcElement.innerText;

    bootbox.dialog({
        title: event.target.innerText,
        message: "<p>What would you like to do to?</p>",
        size: 'large',
        centerVertical: true,
        buttons: {
            ok: {
                label: "Cancel",
                className: 'btn-secondary',
                callback: function() {
                    console.log('Custom OK clicked');
                }
            },
            chart: {
                label: "View Chart",
                className: 'btn-info',
                callback: function() {
                    if (typeof(groupID) == "string") {

                        getGroupScoreToday(groupID, groupName);
                    }
                }
            },
            invite: {
                label: "Group Invite Code",
                className: 'btn-primary',
                callback: function() {
                    window.prompt("Copy to clipboard: Ctrl+C, Enter", groupID);
                }
            },
            cancel: {
                label: "Remove Me From Group",
                className: 'btn-danger',
                callback: function() {
                    removeSelfFromGroup(groupID);
                }
            }
        }
    });
}

/**
 * @desc removes user from a Firebase groups.
 */
function removeSelfFromGroup(groupID) {

    // Prompt the user to re-provide their sign-in credentials
    bootbox.confirm({
        title: "MAYDAY MAYDAY!",
        message: "Do you want to permanently be removed from the group? This cannot be undone.",
        centerVertical: true,
        buttons: {
            cancel: {
                label: '<i class="fa fa-times"></i> Cancel'
            },
            confirm: {
                label: '<i class="fa fa-check"></i> Confirm',
                className: 'btn-danger'

            }
        },
        callback: function(result) {
            if (result == true) {
                // delete all db items

                var userGroupRef = db.collection("users").doc(user.uid);

                console.log(user.uid);
                userGroupRef.update({
                    groups: firebase.firestore.FieldValue.arrayRemove(groupID)
                }).then(function() {
                    var GroupUserRef = db.collection("groups").doc(groupID);
                    GroupUserRef.update({
                        users: firebase.firestore.FieldValue.arrayRemove(user.uid)
                    }).then(function() {
                        window.location.reload();
                    })
                })

            }
        }
    });


}

/**
 * @desc Pull group score data from firebase
 * @param groupID The groupd id to pull the score first.
 * @param groupName The group name the goes with the GroupID.
 */
function getGroupScoreToday(groupID, groupName) {
    let d = new Date();
    let n = d.getMonth();
    month = n + 1;

    let groupScoreList;
    let formatYear = new Date().getFullYear();
    let formatMonth;

    if (month < 10) {
        formatMonth = "0" + (month);
    } else {
        formatMonth = (month);
    }

    // Get group IDs
    let userRef = db.collection('users').doc(user.uid);

    userRef.get().then(function(userDoc) {
        // Get groups the user is in
        groupList = userDoc.data()["groups"];

        let groupRef = db.collection('groups').doc(groupID);

        // Get group members
        groupRef.get()
            .then(function(groupDoc) {
                let memberList = groupDoc.data()["users"];
                groupScoreList = [];

                // Get member's score
                for (let i = 0; i < memberList.length; i++) {
                    let memberId = memberList[i];
                    groupScoreList.push([]);
                    // Ref to memeber
                    /// [[.....]]
                    // Iterate over days
                    let daysInMonth = new Date(formatYear, formatMonth, 0).getDate();
                    for (let dd = 1; dd <= daysInMonth; dd++) {
                        // Format Day to 2 digit
                        let day;
                        if (dd < 10) {
                            day = "0" + dd;
                        } else {
                            day = dd;
                        }
                        // Member's score in a day
                        let scoreDocId = "" + formatYear + formatMonth + day;

                        let userDayScoreRef = db.collection('users').doc(memberId)
                            .collection('surveyTaken').doc(scoreDocId);

                        // Daily score
                        userDayScoreRef.get().then(function(doc) {
                            groupScoreList[i].push(doc.data()["score"]);
                            // Debug info
                        }).catch(function(error) {
                            groupScoreList[i].push(null);
                        });
                    }

                };

                calculateAverage(groupScoreList, groupName);

            }).catch(function(error) {
                console.log("Error getting document:", error);
            }); // End of member loop for a group


    }).catch(function(error) {
        console.log("Error getting document:", error);
    });
}

/**
 * @desc Calculates the average of the group scores.
 * @param groupScoreList array of scores
 * @param groupName the group name array belongs to.
 */
function calculateAverage(groupScoreList, groupName) {

    setTimeout(() => {

        let groupAvgArray = [];
        let num = 0;
        //sEzBH6cBlqQ3JZkfAXNH
        for (let day = 0; day < groupScoreList[0].length - 1; day++) {
            let totalOfDay = 0

            for (let mem = 0; mem <= groupScoreList.length - 1; mem++) {

                if (groupScoreList[mem][day] != null) {
                    totalOfDay += groupScoreList[mem][day];
                    num++;
                }
            }

            groupAvgArray.push(totalOfDay / num)
            num = 0;
        }

        setGraph(groupAvgArray, groupName);
        // Save to local storage 
        localStorage["groupAvgArray"] = JSON.stringify(groupAvgArray);

    }, 2000);

}


/**
 * @desc sets the graph for the month using the chart data.
 * @param chartData array of scores
 * @param groupName the group name array belongs to.
 */
function setGraph(chartData, groupName) {
    // Display heading
    document.getElementById("chartHelp").classList.add("d-none");
    document.getElementById("groupName").innerText =
        "Average Monthly Group Chart For " + groupName;

    // Display graph
    var colors = [ // Color
        "#007bff",
        "#28a745",
        "#333333",
        "#c3e6cb",
        "#dc3545",
        "#6c757d",
    ];


    var chLine = document.getElementById("chLine"); // Type of chart
    var chartData = {
        labels: [ // Labels
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
            "16",
            "17",
            "18",
            "19",
            "20",
            "21",
            "22",
            "23",
            "24",
            "25",
            "26",
            "27",
            "28",
            "29",
            "30",
        ],
        datasets: [{
            label: "Average Mood Score",
            lineTension: 0.1,
            backgroundColor: "rgba(78, 115, 223, 0.05)",
            borderColor: "rgba(78, 115, 223, 1)",
            pointRadius: 1,
            pointBackgroundColor: "rgba(78, 115, 223, 1)",
            pointBorderColor: "rgba(78, 115, 223, 1)",
            pointHoverRadius: 1,
            pointHoverBackgroundColor: "rgba(78, 115, 223, 1)",
            pointHoverBorderColor: "rgba(78, 115, 223, 1)",
            pointHitRadius: 1,
            pointBorderWidth: 2,
            data: chartData,
        }],
    };

    if (chLine) {
        new Chart(chLine, {
            type: "line",
            data: chartData,
            options: {
                maintainAspectRatio: false,
                responsive: true,
                hover: false,
                layout: {
                    padding: {
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0
                    }
                },
                scales: {
                    xAxes: [{
                        time: {
                            unit: 'day'
                        },
                        gridLines: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            maxTicksLimit: 31
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            maxTicksLimit: 100,
                            padding: 0
                        },
                        gridLines: {
                            color: "rgb(234, 236, 244)",
                            zeroLineColor: "rgb(234, 236, 244)",
                            drawBorder: false,
                            borderDash: [2],
                            zeroLineBorderDash: [2]
                        }
                    }],
                },
                legend: {
                    display: false
                }
            },
        });
    }
}