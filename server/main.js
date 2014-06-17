
//var crypto = require('crypto');
var crypto = Npm.require('crypto');

Projects = new Meteor.Collection("projects")
Changes = new Meteor.Collection("changes")
if(Projects.find().count() === 0) {
}

function getDigestEJSON(baseurl, question) {
  var result;
  var username = 'jenkins';
  var password = 'mecel1687#';
  var headers;
  var myurl = baseurl + question.path;
  // console.log("getDigestEJSON:", myurl);

  try {
    result = Meteor.http.call("GET",
    myurl,
    {
      query: question.query,
    }
    );
  } catch (error) {
    // console.log("Error:", error);
    result = error.response;
    //console.log("Result:", result);
    if( result.statusCode === 401) {
      var challengeParams = parseDigest(result.headers['www-authenticate'])
      var ha1er = crypto.createHash('md5');
      ha1er.update(username + ':' + challengeParams.realm + ':' + password)
      var ha1 = ha1er.digest('hex')

      var ha2er = crypto.createHash('md5');
      ha2er.update('GET:' + question.path)
      var ha2 = ha2er.digest('hex')

      var responseer = crypto.createHash('md5');
      responseer.update(ha1 + ':' + challengeParams.nonce + ':1::auth:' + ha2)
      var response = responseer.digest('hex')

      var authRequestParams = {
        username : username,
        realm : challengeParams.realm,
        nonce : challengeParams.nonce,
        uri : question.path, 
        qop : challengeParams.qop,
        response : response,
        nc : '1',
        cnonce : '',
      }
      headers = { 'Authorization' : renderDigest(authRequestParams) }
      //console.log("challengeParams:", challengeParams);
      //console.log("authRequestParams:", authRequestParams);
    }
  }
  try {
    //console.log("headers:", headers);
    //console.log("query: :", question);
    result = Meteor.http.call("GET",
    myurl,
    {
      query: question.query,
      headers: headers,
    });
  } catch (error) {
    //console.log("Auth Result:", result, "Error:", error);
    result = error.response;
  }

  //console.log("Result:", result);
  if(result.statusCode === 200) {
    var issues = EJSON.parse(result.content.substring(5));
    return issues;
  } else {
    return [];
  }
}

function gerritSync(){
  console.log("Gerrit Sync");
  var base_url="http://10.236.89.5:8080";

  var issues = getDigestEJSON(base_url, {path:"/a/changes/?q=status:open", query:{'q':"status:open"}});
  for(var issue in issues) {
    var newIssue = updateIssue(issues[issue]);
    if( newIssue._number === 4164 ) {
      console.log("Gerrit Sync: Open ", newIssue._number, newIssue.email, newIssue.codereview, newIssue.status);
    }
    Changes.upsert({change_id: newIssue.change_id}, newIssue);
  }
  
  var issues = getDigestEJSON(base_url, {path:"/a/changes/?q=status:closed", query:{'q':"status:closed"}});
  for(var issue in issues) {
    var newIssue = issues[issue];
    //Changes.remove({_number: newIssue._number});
    Changes.upsert({_number: newIssue._number}, newIssue);
  }
  console.log("gerritSync(): Done", Changes.find().count() );
}

function updateIssue(issue) {
  issue.changelog = 0;
  issue.codereview = 0;
  issue.scrumcard = 0;
  issue.verified = 0;
  issue.reviewers = [];

  //console.log( issue );
  var issueDetails = getDigestEJSON("http://10.236.89.5:8080", {path:"/a/changes/" + issue._number + "/detail"});
  //console.log("Issue ", issue._number, ":", issueDetails.owner );
  //console.log("Issue ", issue._number, ":", issueDetails.status );
  //console.log("Issue: ", issue);
  //console.log("issueDetails: ", issueDetails);
  issue.email = issueDetails.owner.email;
  //console.log("Issue ", issue._number, ":", Object.keys(issue) );
  //console.log("Issue ", issue._number, ":", Object.keys(issueDetails) );
  //console.log("issueDetails.labels [",'Code-Review',"]: ", Object.keys(issueDetails.labels['Code-Review']));
  //console.log("issueDetails.labels [",'Code-Review',"]: ", issueDetails.labels);
  _.extend(issue, issueDetails);

  var changelog = issueDetails.labels['Change-Log'];
  if(changelog && changelog['approved']) {
    issue.changelog = 1;
  }
  if(changelog && changelog['rejected']) {
    issue.changelog = -1;
  }

  var codereview = issueDetails.labels['Code-Review'];
  //console.log("issueDetails.labels [",'Code-Review',"]: ", Object.keys(codereview));
  for(var all in codereview['all']) {
    var reviewInfo = codereview['all'][all];
    //console.log("all", reviewInfo);
    if(reviewInfo.value != 0 && !(_.contains(issue.reviewers, reviewInfo.email))) {
      issue.reviewers.push(reviewInfo.email);
    }
  }
  //console.log("all", issue.reviewers);
  if(codereview && codereview['approved']) {
    issue.codereview = 2;
  }
  if(codereview && codereview['rejected']) {
    issue.codereview = -1;
  }
  if(codereview && codereview['value']) {
    issue.codereview = codereview['value'];
  }
  var scrumcard = issueDetails.labels['Scrum-Card'];
  if(scrumcard && scrumcard['approved']) {
    issue.scrumcard = 1;
  }
  if(scrumcard && scrumcard['rejected']) {
    issue.scrumcard = -1;
  }
  var verified = issueDetails.labels['Verified'];
  if(verified && verified['approved']) {
    issue.verified = 1;
  }
  if(verified && verified['rejected']) {
    issue.verified = -1;
  }

  /*
  for(var label in issueDetails.labels) {
    console.log("issueDetails.labels [",label,"]: ", Object.keys(issueDetails.labels[label]));
    if(issueDetails.labels[label]['approved']) {
      console.log("issueDetails.labels [",label,"]: ", issueDetails.labels[label]['approved']);
    }
    if(issueDetails.labels[label]['rejected']) {
      console.log("issueDetails.labels [",label,"]: ", issueDetails.labels[label]['rejected']);
    }
    if(issueDetails.labels[label]['value']) {
      console.log("issueDetails.labels [",label,"]: ", issueDetails.labels[label]['value']);
    }
  }
  */

  issue.link = "http://10.236.89.5:8080/" + issue._number ;

  
  return issue
}

function parseDigest(header) {  
    return _(header.substring(7).split(/,\s+/)).reduce(function(obj, s) {
            var parts = s.split('=')
                obj[parts[0]] = s.substring(s.indexOf('=')+1).replace(/"/g, '')
                    return obj
                      }, {})  
}
function renderDigest(params) {
    var s = _(_.keys(params)).reduce(function(s1, ii) {
            return s1 + ', ' + ii + '="' + params[ii] + '"'
              }, '')
      return 'Digest ' + s.substring(2);
}

Meteor.startup(function () {
  console.log("Start up...");
  gs_proc = Meteor.setInterval( function() { gerritSync() }, 50000 );
  gerritSync();
  console.log("Start up! Done.");
});

