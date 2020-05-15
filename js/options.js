const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

//TODO Checkbox stuff - disable other options when checkbox selected.

//! FOR DEBUGGING
const bkg = chrome.extension.getBackgroundPage();

$(function () {

  //Creates the week elements.
  createWeek();

  //Puts in the current url.
  chrome.storage.sync.get({ currentURL: "" }, function (url) {
    if (url.currentURL != "") {
        let trimmedURL = trimURL(url.currentURL);
        $("#block-site").val(trimmedURL);
    }
  });
  //On submission, reset the form and send the data to the background script.
  $("#submit-button").click(function () {
    let url = $("#block-site").val();
    if (url) {
      //Store the given url if it is not a duplicated.
      chrome.storage.sync.get(["timeList"], function (items) {
        let list = items.timeList;
        storeTimeList(list, url);
        resetForm();
      });
    } else {
      alert("No URL submitted!");
    }
  });

  //Handles incorrect min/max on inputs.
  for(let day = 0; day < WEEKDAYS.length; day++) {
    //Code from stack overflow to handle incorrectly min/max on inputs.
    $(`#${WEEKDAYS[day]}-hr`).keydown(function () {
      // Save old value.
      if (!$(this).val() || (parseInt($(this).val()) <= 23 && parseInt($(this).val()) >= 0))
      $(this).data("old-hr", $(this).val());
    });
    $(`#${WEEKDAYS[day]}-hr`).keyup(function () {
      // Check correct, else revert back to old value.
      if (!$(this).val() || (parseInt($(this).val()) <= 23 && parseInt($(this).val()) >= 0))
        ;
      else
        $(this).val($(this).data("old-hr"));
    });
    $(`#${WEEKDAYS[day]}-min`).keydown(function () {
      if (!$(this).val() || (parseInt($(this).val()) <= 59 && parseInt($(this).val()) >= 0))
      $(this).data("old-min", $(this).val());
    });
    $(`#${WEEKDAYS[day]}-min`).keyup(function () {
      if (!$(this).val() || (parseInt($(this).val()) <= 59 && parseInt($(this).val()) >= 0))
        ;
      else
        $(this).val($(this).data("old-min"));
    });
  }

  //Reset the form
  $("#reset-button").click(function() {
    resetForm();
  });
});

//Checks for a duplicate link, if none exists, add the site to the blocked list.
function storeTimeList(urlTimeArray, url) {
  //If the link is a duplicate.
  if (isInTimeList(urlTimeArray, url)) {
    alert("This link has already been added to the site list, if you want to modify it, go to the site list.");
  }
  //If it's a unique URL add it to the timelist, with a default time of 15 seconds.
  else {
    const times = getTimesByWeekday();
    urlTimeArray.push({ url: url, time: times});
    chrome.storage.sync.set({ timeList: urlTimeArray }, function () {
      //Do something after set.
    });
  }
}

function getTimesByWeekday() {
  let weekdayTimes = [];
  for(let day = 0; day < WEEKDAYS.length; day++) {
    const hours = parseInt($(`#${WEEKDAYS[day]}-hr`).val());
    const minutes = parseInt($(`#${WEEKDAYS[day]}-min`).val());
    weekdayTimes.push({dailyTime: 0, dayLimit: convertToSeconds(hours, minutes)});
  }
  return weekdayTimes;
}

function convertToSeconds(hours, minutes) {
  return hours * 3600 + minutes * 60;
}

//Checks for duplicate url in the urlTimeArray.
function isInTimeList(urlTimeArray, url) {
  const isDuplicate = (item) => item.url == url;
  return urlTimeArray.some(isDuplicate);
}

//Trims the url to a reasonable setup - e.g. https://facebook.com/GV9?utB_eg2j to www.facebook.com
function trimURL(url) {
  //Regex to trim urls.
  let re = /([a-zA-Z0-9-]*\.)+\w*/;
  let trimmed = re.exec(url);
  //If it is a trimmable url, trim it.
  if (trimmed != undefined) {
    return trimmed[0];
  }
  //Otherwise use the raw url.
  else {
      return url;
  }
}

//For updating the url in the input box even if options page is already open or has input.
chrome.storage.onChanged.addListener(function (changes) {
  if (changes.currentURL != undefined) {
    //Trim the new url and change the DOM to reflect.
    $("#block-site").val(trimURL(changes.currentURL.newValue));
  }
});

//I put it into a function for if I want to make it so that users can individually select days, rather than see a whole form at once.
function createWeek() {
  for(let day = 0; day < WEEKDAYS.length; day++) {
    createWeekday(WEEKDAYS[day]);
  }
}

//Create individual days.
function createWeekday(weekday) {
  createParagraphElement('weekday-input', `${capitalize(weekday)}`, 'weekday-text');
  createLabelElement('weekday-input', `${weekday}-hr`, 'Hours', 'hr-label');
  createInputElement('weekday-input', 'number', `${weekday}-hr`, "0", 'input-time', `${weekday}-hr`, "0", "23");
  createLabelElement('weekday-input', `${weekday}-min`, 'Minutes', 'min-label');
  createInputElement('weekday-input', 'number', `${weekday}-min`, "0", 'input-time', `${weekday}-min`, "0", "59");
  createLabelElement('weekday-input', `${weekday}-blocked`, 'Block All Day', 'checkbox-label');
  createInputElement('weekday-input', 'checkbox', `${weekday}-blocked`, "", "weekday-checkbox", `${weekday}-blocked`);
  createLabelElement('weekday-input', `${weekday}-unrestricted`, 'Unrestricted', 'checkbox-label');
  createInputElement('weekday-input', 'checkbox', `${weekday}-unrestricted`, "", "weekday-checkbox", `${weekday}-unrestricted`);
}

//Creates a text paragraph element.
function createParagraphElement(parentId="", innerHTML="", classTag="", idTag="") {
  const parent = document.getElementById(parentId);
  let paragraph = document.createElement('p');
  paragraph.innerHTML = innerHTML;
  //Optional parameters.
  if(classTag != "") paragraph.className = classTag;
  if(idTag != "") paragraph.id = idTag;
  parent.appendChild(paragraph);
}

//Create the necessary label elements.
function createLabelElement(parentId="", forTag="", innerHTML="", classTag="", idTag="") {
  const parent = document.getElementById(parentId);
  let label = document.createElement('label');
  label.htmlFor = forTag;
  label.innerHTML = innerHTML;
  //Optional parameters.
  if(classTag != "") label.className = classTag;
  if(idTag != "") label.id = idTag;
  parent.appendChild(label);
}

//Create the necessary input elements.
function createInputElement(parentId="", type="", name="", value="", classTag="", idTag="", min="", max="") {
  const parent = document.getElementById(parentId);
  let input = document.createElement('input');
  input.type = type;
  input.name = name;
  //Optional parameters.
  if(value != "") input.value = value;
  if(classTag != "") input.className = classTag;
  if(idTag != "") input.id = idTag;
  if(min != "") input.min = min;
  if(max != "") input.max = max;
  parent.appendChild(input);
}

//Capitalize the first letter.
function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

//Clears the form data.
function resetForm() {
  $("#block-site").val("");
  for(let day = 0; day < WEEKDAYS.length; day++) {
    $(`#${WEEKDAYS[day]}-hr`).val(0);
    $(`#${WEEKDAYS[day]}-min`).val(0);
    $(`#${WEEKDAYS[day]}-blocked`).prop("checked", false);
    $(`#${WEEKDAYS[day]}-unrestricted`).prop("checked", false);
  }
}
