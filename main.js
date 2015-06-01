var fs = require('fs');
var json2csv = require('json2csv');
var _ = require('lodash');
var messageFormat = require('messageformat');
var colors = require('colors');

var Keys = require('./keys.js');
var maxGroupOneClassSizes = require('./class-size.json').group1;
var maxGroupTwoClassSizes = require('./class-size.json').group2;

var currentGroupOneClassSizes = {
    "phy": 0,
    "bio": 0,
    "bafs": 0,
    "chist": 0,
    "ths": 0,
    "ict1": 0,
    "va": 0
};
var currentGroupTwoClassSizes = {
    "chem": 0,
    "cscb": 0,
    "cscp": 0,
    "econ": 0,
    "geog": 0,
    "hist": 0,
    "ict2": 0
};

// sort the Students in order of position of form
// return array will not have the following student record.
// - students who didn't submit the form.
// - students who have not positon in form (``)
function sortStudentInOrder(orders, students){
  return _(students)
            .map(
              function(sts){
                return _.assign(sts, _.find(orders, {"_id": sts._id}));
              })
            // _.remove return new array of removed elements
            .remove(function(sts){
                return sts.isConfirmed &&
                      (sts.position !== undefined) &&
                      /lp[0-9]{7}/.test(sts._id);
            })
            .sortBy("position")
            .value();
}

var sortedStudentChoices = sortStudentInOrder(Positions, StudentChoices);

// total number of student who submitted the form
var noOfStudent = sortedStudentChoices.length;

// convert student's ole and choices to array of their choices,
function flattenData(sts){
  var index = 0;
  var obj = {};
  var ole = [];
  var choices = [];

  _.map(sts, function(value, key){
    if (index < 5) {
      obj[key] = value;
    } else if (index < 8) {
      ole.push(value);
    } else if (index < 54){
      choices.push(value);
    } else {
      obj[key] = value;
    }
    index += 1;
  });
  obj.ole = ole;
  obj.choices = choices;
  return obj;
}

// return the total number of a group
// e.g. if you want to get total no of student in current group 1,
// totalNumberInGroup(currentGroupOneClassSizes);
function totalNumberInGroup(classSizes) {
  var result = 0;
  _.mapKeys(classSizes, function(value, key){
    result += value;
  });
  return result;
}

// counter for statistic
var counter = (function() {
  var obj = {};
  obj.counterOfFirstChoice = 0;
  obj.counterOfSecondChoice = 0;
  obj.counterOfThirdChoice = 0;
  obj.counterOfBestFive = 0;
  obj.counterOfBestTen = 0;

  return function triggerCounter (number){
    switch(number){
      case 1:
        obj.counterOfFirstChoice += 1;
        obj.counterOfBestFive += 1;
        obj.counterOfBestTen += 1;
      break;
      case 2:
        obj.counterOfSecondChoice += 1;
        obj.counterOfBestFive += 1;
        obj.counterOfBestTen += 1;
      break;
      case 3:
        obj.counterOfThirdChoice += 1;
        obj.counterOfBestFive += 1;
        obj.counterOfBestTen += 1;
      break;
      default:
        if (number < 6) {
          obj.counterOfBestFive += 1;
        } else if (number < 11) {
          obj.counterOfBestTen += 1;
        }
    }
    return obj;
  };
}());

function assignSubject(choices, postionOfChoice) {
  // if loop over the total number of combination, throw error
  if (postionOfChoice > 46){
    throw new Error("Error! no subject match!:\n" + genStat());
  }

  var result = {};
  var choice =  Keys.choices[choices.indexOf(postionOfChoice)];
  var array = choice.split("+");
  var isValidX1 = currentGroupOneClassSizes[array[0]] < maxGroupOneClassSizes[array[0]];
  var isValidX2 = currentGroupTwoClassSizes[array[1]] < maxGroupTwoClassSizes[array[1]];

  // if both subject are full
  if (isValidX1 && isValidX2){
    currentGroupOneClassSizes[array[0]] += 1;
    currentGroupTwoClassSizes[array[1]] += 1;
    result.x1 = array[0];
    result.x2 = array[1];
    result.positionInX1 = currentGroupOneClassSizes[array[0]];
    result.positionInX2 = currentGroupTwoClassSizes[array[1]];
    result.positionInChoices = postionOfChoice;
    counter(postionOfChoice);
    return result;
  }

  try {
    return assignSubject(choices, postionOfChoice + 1);
  }
  catch (err){
    // if error of occur (postionOfChoice > 46)
    console.error(colors.red.bold(err.message));
    return false;
  }
}

function execAssignToAllStudent(students){
  return _(students)
            .map(function(sts){
              var choices = flattenData(sts).choices;
              var subjectResult = assignSubject(choices, 1);

              if (!subjectResult) {
                console.log("Can't assign subject to %s", sts._id);
                return sts;
              }

              console.log("assigned subject to: %s ", sts._id);
              return _.assign(sts, subjectResult);
            })
            .sortBy("classNo")
            .value();
}

var finalResult = execAssignToAllStudent(sortedStudentChoices);

// generate statistic
function genStat (detail){
  var mf = new messageFormat('en');
  var counterResult = counter();

  var group1 = _.mapValues(currentGroupOneClassSizes, function(value, key){
    return  value + '/' + maxGroupOneClassSizes[key];
  });

  var group2 = _.mapValues(currentGroupTwoClassSizes, function(value, key){
    return  value + '/' + maxGroupTwoClassSizes[key];
  });

  var obj = {
    noOfStudent: noOfStudent,
    currentTotalInGroupOne: totalNumberInGroup(currentGroupOneClassSizes),
    currentTotalInGroupTwo: totalNumberInGroup(currentGroupTwoClassSizes),
    maxTotalInGroupOne: totalNumberInGroup(maxGroupOneClassSizes),
    maxTotalInGroupTwo: totalNumberInGroup(maxGroupTwoClassSizes),
    counterOfFirstChoice: counterResult.counterOfFirstChoice,
    counterOfSecondChoice: counterResult.counterOfSecondChoice,
    counterOfThirdChoice: counterResult.counterOfThirdChoice,
    counterOfBestFive: counterResult.counterOfBestFive,
    counterOfBestTen: counterResult.counterOfBestTen,
    currentGroupOneClassSizes: JSON.stringify(group1, null, "\t"),
    currentGroupTwoClassSizes: JSON.stringify(group2, null, "\t"),
  };

  var statistic = "";
  statistic += "# statistic of F4 subject selection\n";
  statistic += "Total Number of Student: {noOfStudent}\n";
  statistic += "X1: {currentTotalInGroupOne}/ {maxTotalInGroupOne}\n";
  statistic += "X2: {currentTotalInGroupOne}/ {maxTotalInGroupTwo}\n";
  if (detail) {
    statistic += "no of first choice: {counterOfFirstChoice}\n";
    statistic += "no of second choice: {counterOfSecondChoice}\n";
    statistic += "no of third choice: {counterOfThirdChoice}\n";
    statistic += "no of best five: {counterOfBestFive}\n";
    statistic += "no of best ten: {counterOfBestTen}\n";
  }
  statistic += "\n```js\n";
  statistic += "// Group1\n";
  statistic += "{currentGroupOneClassSizes}\n";
  statistic += "```\n";
  statistic += "\n```js\n";
  statistic += "// Group2\n";
  statistic += "{currentGroupTwoClassSizes}\n";
  statistic += "```\n";

  var vfunc = mf.compile(statistic);
  return vfunc(obj);
}

// if need to show all fields, use the defaultField instead.
// var defaultField = ["_id", "classNo", "name", "cname", "isConfirmed", "D&T", "Cookery", "Music", "phy+chem", "phy+cscb", "phy+econ", "phy+geog", "phy+hist", "phy+ict2", "bio+chem", "bio+cscp", "bio+econ", "bio+geog", "bio+hist", "bio+ict2", "bafs+chem", "bafs+cscb", "bafs+cscp", "bafs+econ", "bafs+geog", "bafs+hist", "bafs+ict2", "ths+chem", "ths+cscb", "ths+cscp", "ths+econ", "ths+geog", "ths+hist", "ths+ict2", "chist+chem", "chist+cscb", "chist+cscp", "chist+econ", "chist+geog", "chist+hist", "chist+ict2", "ict1+chem", "ict1+cscb", "ict1+cscp", "ict1+econ", "ict1+geog", "ict1+hist", "va+chem", "va+cscb", "va+cscp", "va+econ", "va+geog", "va+hist", "va+ict2", "x1", "x2", "positionInX1", "positionInX2", "positionInChoices", "position" ];
var field = ["_id", "classNo", "name", "isConfirmed", "x1", "x2", "positionInX1", "positionInX2", "positionInChoices", "position" ];
fs.writeFileSync("./result/result.json", JSON.stringify(finalResult, null, "\t"));

// convert result from json to csv format
json2csv({data: finalResult, fields: field}, function(err, csv){
  if (err) throw err;
    fs.writeFileSync("./result/result.csv", csv);
});

// print statistic
fs.writeFileSync("./result/statistic.md", genStat(true));
