
Projects = new Meteor.Collection("projects")
Changes = new Meteor.Collection("changes")


Template.main.greeting = function () {
  return "Welcome to Gerrit Status.";
};

Template.main.events({
  'click .user-dropdown': function (event) {
  if (typeof console !== 'undefined')
    console.log("Click .user-dropdown", event.target.innerText);
    Session.set("currentUser", event.target.innerText);
    setCookie("email", event.target.innerText, 30);
  },
/*
  'click .user-selection': function () {
  if (typeof console !== 'undefined')
    console.log("Click .user-selection");
  },
  'click': function () {
  if (typeof console !== 'undefined')
    console.log("Click");
  },
  'change': function() {
  if (typeof console !== 'undefined')
    console.log("Change");
  },
  'focus': function() {
  if (typeof console !== 'undefined')
    console.log("focus");
  },
  'blur': function() {
  if (typeof console !== 'undefined')
    console.log("blur");
  },
  'mouseenter': function() {
  if (typeof console !== 'undefined')
    console.log("mouseenter");
  },
  'mouseleave': function() {
  if (typeof console !== 'undefined')
    console.log("mouseleave");
  },
  */
});

Template.change.issueStatus = function() {
  if(this.codereview > 1 && this.verified > 0) {
    return "change_merge";
  }
  if(this.codereview < 0 || this.changelog < 0 || this.verified < 0) {
    return "change_actionneeded";
  }
  if(this.verified === 1) {
    return "change_getreview";
  }
  if(this.codereview === 1) {
    return "change_getreview";
  }
  if(this.project === "PopulusEditor" && this.verified === 0) {
    return "change_getreview";
  }
  return "change_inprogress";
}

Template.main.yourChanges = function() {
  var changes = Changes.find({ email: Session.get("currentUser"), status: "NEW"}, {sort: {_number: -1}});
  return changes;
}

Template.main.haveOpenChanges = function() {
  var changes = Changes.find({ email: Session.get("currentUser"), status: "NEW"}, {sort: {_number: -1}});
  return changes.count() != 0;
}

Template.main.currentUser = function() {
  return Session.get("currentUser");
}

Template.main.yourReviews = function() {
  var changes = Changes.find({
        email: { $ne:  Session.get("currentUser")} ,
        status: "NEW",
        codereview: {$in: [0, 1]},
        reviewers: {$elemMatch: { $ne:  Session.get("currentUser")}}
      },
      {sort: {_number: -1}});
  //console.log(changes.fetch());
  return changes;
}

Template.main.haveOpenReviews = function() {
  var changes = Changes.find({
        email: { $ne:  Session.get("currentUser")} ,
        status: "NEW",
        codereview: {$in: [0, 1]},
        reviewers: {$elemMatch: { $ne:  Session.get("currentUser")}}
      },
      {sort: {_number: -1}});
  return changes.count() != 0;
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+d.toGMTString();
  document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(';');
  for(var i=0; i<ca.length; i++) {
    var c = ca[i].trim();
    if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
  }
  return "";
}

Meteor.startup(function() {
  var email = getCookie("email");
  if (email != "") {
    Session.setDefault("currentUser", email);
  } else {
    Session.setDefault("currentUser", "Anders.Arnholm@delphi.com");
  }
});

