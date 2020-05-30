const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DIVS = ["add-site", "site-list"];

let siteList = [];

//TODO Editting daily information, block attempts to edit current day limit.
//TODO Cleaner interface for adding block information.
//TODO Get rid of the 0 on forms when a new number is typed in, or get rid of it altogether.

//! FOR DEBUGGING
const bkg = chrome.extension.getBackgroundPage();

$(function () {

  //Creates the site elements.
  chrome.storage.sync.get("timeList", function (items) {
    siteList = items.timeList;
    updateSiteList(siteList);
  });

  //Creates the week elements.
  createWeekDropdown('weekday-input');

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

  //Hides the other page divs, shows the add site.
  $("#add-tag").click(function () {
    showDiv("add-site");
  });

  //Hides the other page divs, shows the site-list.
  $("#site-tag").click(function () {
    showDiv("site-list");
  });

  //Handles input validation on checkboxes and number inputs.
  validateForm();

  //Reset the form
  $("#reset-button").click(function () {
    resetForm();
  });
});

//Show this div, hide the others.
//TODO FIX WRONG HREF.
function showDiv(id) {
  for (let index = 0; index < DIVS.length; index++) {
    if (DIVS[index] == id) continue;
    $(`#${DIVS[index]}`).hide();
  }
  $(`#${id}`).show();
}

//Checks for a duplicate link, if none exists, add the site to the blocked list.
function storeTimeList(urlTimeArray, url) {
  //If the link is a duplicate.
  if (isInTimeList(urlTimeArray, url)) {
    alert(
      "This link has already been added to the site list, if you want to modify it, go to the site list."
    );
  }
  //If it's a unique URL add it to the timelist, with a default time of 15 seconds.
  else {
    const times = getTimesByWeekday();
    urlTimeArray.push({ url: url, time: times });
    siteList = urlTimeArray;
    chrome.storage.sync.set({ timeList: urlTimeArray }, function () {
      updateSiteList(siteList);
    });
    resetForm();
  }
}

//Returns a formatted version of the form information for the inputs regarding the block time per day.
function getTimesByWeekday(id = "") {
  let weekdayTimes = [];
  for (let day = 0; day < WEEKDAYS.length; day++) {
    if ($(`#${WEEKDAYS[day]}-unrestricted-${id}`).is(":checked")) {
      weekdayTimes.push({ timeUsed: 0, dayLimit: -1 });
    } else if ($(`#${WEEKDAYS[day]}-blocked-${id}`).is(":checked")) {
      weekdayTimes.push({ timeUsed: 0, dayLimit: 0 });
    } else {
      const hours = parseInt($(`#${WEEKDAYS[day]}-hr-${id}`).val());
      const minutes = parseInt($(`#${WEEKDAYS[day]}-min-${id}`).val());
      weekdayTimes.push({
        timeUsed: 0,
        dayLimit: convertToSeconds(hours, minutes),
      });
    }
  }
  return weekdayTimes;
}

//For updating the url in the input box even if options page is already open or has input.
chrome.storage.onChanged.addListener(function (changes) {
  if (changes.currentURL != undefined) {
    //Trim the new url and change the DOM to reflect.
    $("#block-site").val(trimURL(changes.currentURL.newValue));
    showDiv("add-site");
  }
});

//I put it into a function for if I want to make it so that users can individually select days, rather than see a whole form at once.
function createWeek(parentElement, id) {
  for (let day = 0; day < WEEKDAYS.length; day++) {
    createWeekday(day, parentElement, id);
  }
}

function createWeekDropdown(parentElement, id) {
  createDiv(parentElement, 'dropdown', `dropdown-${id}`);
  dropdownProperties = [{property: 'data-toggle', value: 'dropdown'}, {property: 'aria-haspopup', value: 'true'}, {property: 'aria-expanded', value: 'false'}];
  createButtonElement(`dropdown-${id}`, 'Edit', "btn btn-secondary btn-lg dropdown-toggle", `add-site-button-${id}`, dropdownProperties);
  createDiv(`dropdown-${id}`, 'dropdown-menu', `dropdown-menu-${id}`);
  //Adds weekdays.
  for(let index = 0; index < WEEKDAYS.length; index++) {
    createButtonElement(`dropdown-menu-${id}`, `${capitalize(WEEKDAYS[index])}`, `dropdown-item`, `${WEEKDAYS[index]}-${id}`)
  }
}

//Create individual days.
function createWeekday(day, parentElement, id = "") {

  //Needed for editting forms.
  const weekday = WEEKDAYS[day];
  let minutes = "0";
  let hours = "0";
  let unrestricted = false;
  let blocked = false;

  //Checks if edit forms have information already.
  if(siteList[id] != undefined) {
    seconds = siteList[id].time[day].dayLimit;
    hours = Math.floor(seconds / 3600).toString();
    minutes = Math.floor((seconds % 3600) / 60).toString();
    if(seconds == 0) {
      blocked = true;
    }
    else if(seconds == -1) {
      unrestricted = true;
      hours = "0";
      minutes = "0";
    }
  }
  createParagraphElement(
    parentElement,
    `${capitalize(weekday)}`,
    "weekday-text"
  );
  createLabelElement(parentElement, `${weekday}-hr`, "Hours", "hr-label");
  createInputElement(
    parentElement,
    "number",
    `${weekday}-hr-${id}`,
    hours,
    "input-time",
    `${weekday}-hr-${id}`,
    "0",
    "23"
  );
  createLabelElement(parentElement, `${weekday}-min`, "Minutes", "min-label");
  createInputElement(
    parentElement,
    "number",
    `${weekday}-min-${id}`,
    minutes,
    "input-time",
    `${weekday}-min-${id}`,
    "0",
    "59"
  );
  createLabelElement(
    parentElement,
    `${weekday}-blocked`,
    "Block All Day",
    "checkbox-label"
  );
  createInputElement(
    parentElement,
    "checkbox",
    `${weekday}-blocked-${id}`,
    "",
    "weekday-checkbox",
    `${weekday}-blocked-${id}`
  );
  createLabelElement(
    parentElement,
    `${weekday}-unrestricted`,
    "Unrestricted",
    "checkbox-label"
  );
  createInputElement(
    parentElement,
    "checkbox",
    `${weekday}-unrestricted-${id}`,
    "",
    "weekday-checkbox",
    `${weekday}-unrestricted-${id}`
  );

  //Adds checks for the unrestricted/blocked box.
  if(unrestricted) {
    $(`#${weekday}-unrestricted-${id}`).prop("checked", true);
    $(`#${weekday}-hr-${id}`).prop("disabled", true);
    $(`#${weekday}-min-${id}`).prop("disabled", true);
  }
  else if(blocked) {
    $(`#${weekday}-blocked-${id}`).prop("checked", true);
    $(`#${weekday}-hr-${id}`).prop("disabled", true);
    $(`#${weekday}-min-${id}`).prop("disabled", true);
  }
}

//Creates the whole sitelist.
function createSiteList(siteList) {
  for (let index = 0; index < siteList.length; index++) {
    createSite(siteList[index], index);
    validateForm(index);
  }
}

//Creates an individual site.
function createSite(site, id) {
  createDiv("sites", 'site-div', `site-div-${id}`);
  createParagraphElement(`site-div-${id}`, site.url, "site-names", `site-p${id}`);
  createButtonElement(`site-div-${id}`, "Edit", "edit-buttons", `site-edit-${id}`);
  createButtonElement(`site-div-${id}`, "Remove", "remove-buttons", `site-remove-${id}`);
  createWeek(`site-div-${id}`, id);
}

function updateSiteList(siteList) {
  $("#sites").empty();
  createSiteList(siteList);
  createSiteButtonResponse(siteList);
}

//Creates a div.
function createDiv(parentId = "", classTag = "", idTag = "") {
  const parent = document.getElementById(parentId);
  let div = document.createElement("div");
  //Optional parameters.
  if (classTag != "") div.className = classTag;
  if (idTag != "") div.id = idTag;
  parent.appendChild(div);
}

//Creates a text paragraph element.
function createParagraphElement(
  parentId = "",
  innerHTML = "",
  classTag = "",
  idTag = ""
) {
  const parent = document.getElementById(parentId);
  let paragraph = document.createElement("p");
  paragraph.innerHTML = innerHTML;
  //Optional parameters.
  if (classTag != "") paragraph.className = classTag;
  if (idTag != "") paragraph.id = idTag;
  parent.appendChild(paragraph);
}

function createButtonElement(
  parentId = "",
  innerHTML = "",
  classTag = "",
  idTag = "",
  additionalAttributes = []
) {
  const parent = document.getElementById(parentId);
  let button = document.createElement("button");
  button.innerHTML = innerHTML;
  //Optional parameters.
  if (classTag != "") button.className = classTag;
  if (idTag != "") button.id = idTag;
  if (additionalAttributes.length > 0) {
    for(let index = 0; index < additionalAttributes.length; index++) {
      button.setAttribute(additionalAttributes[index].property, additionalAttributes[index].value);
    }
  }
  parent.appendChild(button);
}

//Create the necessary label elements.
function createLabelElement(
  parentId = "",
  forTag = "",
  innerHTML = "",
  classTag = "",
  idTag = ""
) {
  const parent = document.getElementById(parentId);
  let label = document.createElement("label");
  label.htmlFor = forTag;
  label.innerHTML = innerHTML;
  //Optional parameters.
  if (classTag != "") label.className = classTag;
  if (idTag != "") label.id = idTag;
  parent.appendChild(label);
}

//Create the necessary input elements.
function createInputElement(
  parentId = "",
  type = "",
  name = "",
  value = "",
  classTag = "",
  idTag = "",
  min = "",
  max = ""
) {
  const parent = document.getElementById(parentId);
  let input = document.createElement("input");
  input.type = type;
  input.name = name;
  //Optional parameters.
  if (value != "") input.value = value;
  if (classTag != "") input.className = classTag;
  if (idTag != "") input.id = idTag;
  if (min != "") input.min = min;
  if (max != "") input.max = max;
  parent.appendChild(input);
}

//Capitalize the first letter.
function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

//Clears the form data.
function resetForm(id = "") {
  $("#block-site").val("");
  for (let day = 0; day < WEEKDAYS.length; day++) {
    $(`#${WEEKDAYS[day]}-hr-${id}`).val(0);
    $(`#${WEEKDAYS[day]}-min-${id}`).val(0);
    $(`#${WEEKDAYS[day]}-blocked-${id}`).prop("checked", false);
    $(`#${WEEKDAYS[day]}-unrestricted-${id}`).prop("checked", false);
  }
}

//Handles incorrect min/max on inputs.
//Also handles the checkbox graphics.
function validateForm(id = "") {
  for (let day = 0; day < WEEKDAYS.length; day++) {
    //Code from stack overflow to handle incorrectly min/max on inputs.
    $(`#${WEEKDAYS[day]}-hr-${id}`).keydown(function () {
      // Save old value.
      if (
        !$(this).val() ||
        (parseInt($(this).val()) <= 23 && parseInt($(this).val()) >= 0)
      )
        $(this).data(`old-hr-${id}`, $(this).val());
    });
    $(`#${WEEKDAYS[day]}-hr-${id}`).keyup(function () {
      // Check correct, else revert back to old value.
      if (
        !$(this).val() ||
        (parseInt($(this).val()) <= 23 && parseInt($(this).val()) >= 0)
      );
      else $(this).val($(this).data(`old-hr-${id}`));
    });
    $(`#${WEEKDAYS[day]}-min-${id}`).keydown(function () {
      if (
        !$(this).val() ||
        (parseInt($(this).val()) <= 59 && parseInt($(this).val()) >= 0)
      )
        $(this).data(`old-min-${id}`, $(this).val());
    });
    $(`#${WEEKDAYS[day]}-min-${id}`).keyup(function () {
      if (
        !$(this).val() ||
        (parseInt($(this).val()) <= 59 && parseInt($(this).val()) >= 0)
      );
      else $(this).val($(this).data(`old-min-${id}`));
    });

    //Checkbox details.
    $(`#${WEEKDAYS[day]}-unrestricted-${id}`).click(function () {
      //If it is checked.
      if ($(`#${WEEKDAYS[day]}-unrestricted-${id}`).is(":checked")) {
        $(`#${WEEKDAYS[day]}-blocked-${id}`).prop("checked", false);
        $(`#${WEEKDAYS[day]}-hr-${id}`).prop("disabled", true);
        $(`#${WEEKDAYS[day]}-min-${id}`).prop("disabled", true);
      }
      //It is unchecked.
      else {
        $(`#${WEEKDAYS[day]}-hr-${id}`).prop("disabled", false);
        $(`#${WEEKDAYS[day]}-min-${id}`).prop("disabled", false);
      }
    });
    //Repeat with blocked checkbox.
    $(`#${WEEKDAYS[day]}-blocked-${id}`).click(function () {
      if ($(`#${WEEKDAYS[day]}-blocked-${id}`).is(":checked")) {
        $(`#${WEEKDAYS[day]}-unrestricted-${id}`).prop("checked", false);
        $(`#${WEEKDAYS[day]}-hr-${id}`).prop("disabled", true);
        $(`#${WEEKDAYS[day]}-min-${id}`).prop("disabled", true);
      } else {
        $(`#${WEEKDAYS[day]}-hr-${id}`).prop("disabled", false);
        $(`#${WEEKDAYS[day]}-min-${id}`).prop("disabled", false);
      }
    });
  }
}

//Creates actionable items on siteList
function createSiteButtonResponse(siteList) {
  for (let index = 0; index < siteList.length; index++) {
    $(`#site-edit-${index}`).click(function () {
      bkg.console.log(`Edit: ${index}`);
      siteList[index].time = getTimesByWeekday(index);
      chrome.storage.sync.set({timeList: siteList}, function() {
        bkg.console.log('SiteList Set');
      });
      //chrome.runtime.sendMessage({edit});
      resetForm(index);
    });
    $(`#site-remove-${index}`).click(function () {
      chrome.runtime.sendMessage({ unblock: siteList[index].url });
      siteList.splice(index, 1);
      bkg.console.log(siteList);
      chrome.storage.sync.set({ timeList: siteList }, function () {
        updateSiteList(siteList);
        bkg.console.log("Removal complete");
      });
    });
  }
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

//Converts hours and minutes to seconds.
function convertToSeconds(hours, minutes) {
  return hours * 3600 + minutes * 60;
}
