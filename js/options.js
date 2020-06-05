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
//TODO Get rid of the 0 on forms when a new number is typed in, or get rid of it altogether.
//TODO Only allow specific types of URLs
//TODO Fix site list responses - need to add a submit option for when the weekdays start.
//TODO Parental locks on edit/remove using a 4 digit PIN.

//! FOR DEBUGGING
const bkg = chrome.extension.getBackgroundPage();

$(function () {
  //Creates the site elements.
  chrome.storage.sync.get("timeList", function (items) {
    siteList = items.timeList;
    updateSiteList(siteList);
  });

  //Creates the week elements.
  createWeekDropdown("weekday-input");

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

  //Reset the form
  $("#reset-button").click(function () {
    resetForm();
  });
});

//Show this div, hide the others.
//TODO FIX WRONG HREF.
function showDiv(id = "") {
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
    if (document.getElementById(`${WEEKDAYS[day]}-div-${id}`) == null) {
      weekdayTimes.push({ timeUsed: 0, dayLimit: -1 });
    } else if ($(`#${WEEKDAYS[day]}-unrestricted-${id}`).is(":checked")) {
      weekdayTimes.push({ timeUsed: 0, dayLimit: -1 });
    } else if ($(`#${WEEKDAYS[day]}-blocked-${id}`).is(":checked")) {
      weekdayTimes.push({ timeUsed: 0, dayLimit: 0 });
    } else {
      const hours = Number.isInteger(parseInt($(`#${WEEKDAYS[day]}-hr-${id}`).val())) ? parseInt($(`#${WEEKDAYS[day]}-hr-${id}`).val()) : 0;
      const minutes = Number.isInteger(parseInt($(`#${WEEKDAYS[day]}-min-${id}`).val())) ? parseInt($(`#${WEEKDAYS[day]}-min-${id}`).val()) : 0;
      const seconds = convertToSeconds(hours, minutes) > 0 ? convertToSeconds(hours, minutes) : -1;
      weekdayTimes.push({
        timeUsed: 0,
        dayLimit: seconds,
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
function createWeek(parentElement, id = "") {
  for (let day = 0; day < WEEKDAYS.length; day++) {
    createWeekday(day, parentElement, id);
  }
}

function createWeekDropdown(parentElement, id = "") {
  createDiv(parentElement, "dropdown", `dropdown-${id}`);
  dropdownProperties = [
    { property: "data-toggle", value: "dropdown" },
    { property: "aria-haspopup", value: "true" },
    { property: "aria-expanded", value: "false" },
  ];
  createButtonElement(
    `dropdown-${id}`,
    "Edit",
    "btn btn-secondary btn-lg dropdown-toggle",
    `add-site-button-${id}`,
    dropdownProperties
  );
  createDiv(`dropdown-${id}`, "dropdown-menu", `dropdown-menu-${id}`);
  //Div to hold all the days.
  createDiv(`dropdown-${id}`, 'week-form', `week-form-${id}`);
  //Adds weekdays.
  for (let index = 0; index < WEEKDAYS.length; index++) {
    createButtonElement(
      `dropdown-menu-${id}`,
      `${capitalize(WEEKDAYS[index])}`,
      `dropdown-item`,
      `${WEEKDAYS[index]}-${id}`
    );
    $(`#${WEEKDAYS[index]}-${id}`).click(function () {
      if (document.getElementById(`${WEEKDAYS[index]}-div-${id}`) == null)
        createWeekday(index, `week-form-${id}`, id);
    });
  }
}

//Create individual days.
function createWeekday(day, parentElement, id = "") {
  //Needed for editting forms.
  const weekday = WEEKDAYS[day];
  let minutes = "";
  let hours = "";
  let unrestricted = false;
  let blocked = false;

  //Checks if edit forms have information already.
  if (siteList[id] != undefined) {
    seconds = siteList[id].time[day].dayLimit;
    hours = Math.floor(seconds / 3600).toString();
    minutes = Math.floor((seconds % 3600) / 60).toString();
    if (seconds == 0) {
      blocked = true;
    } else if (seconds == -1) {
      unrestricted = true;
      hours = "";
      minutes = "";
    }
  }
  createWeekdayDiv(parentElement, weekday, id);
  createParagraphElement(
    `${weekday}-div-${id}`,
    `${capitalize(weekday)}`,
    "weekday-text"
  );
  createLabelElement(
    `${weekday}-div-${id}`,
    `${weekday}-hr`,
    "Hours",
    "hr-label"
  );
  createInputElement(
    `${weekday}-div-${id}`,
    "number",
    `${weekday}-hr-${id}`,
    hours,
    "input-time",
    `${weekday}-hr-${id}`,
    "0",
    "23"
  );
  createLabelElement(
    `${weekday}-div-${id}`,
    `${weekday}-min`,
    "Minutes",
    "min-label"
  );
  createInputElement(
    `${weekday}-div-${id}`,
    "number",
    `${weekday}-min-${id}`,
    minutes,
    "input-time",
    `${weekday}-min-${id}`,
    "0",
    "59"
  );
  createLabelElement(
    `${weekday}-div-${id}`,
    `${weekday}-blocked`,
    "Block All Day",
    "checkbox-label"
  );
  createInputElement(
    `${weekday}-div-${id}`,
    "checkbox",
    `${weekday}-blocked-${id}`,
    "",
    "weekday-checkbox",
    `${weekday}-blocked-${id}`
  );
  createLabelElement(
    `${weekday}-div-${id}`,
    `${weekday}-unrestricted`,
    "Unrestricted",
    "checkbox-label"
  );
  createInputElement(
    `${weekday}-div-${id}`,
    "checkbox",
    `${weekday}-unrestricted-${id}`,
    "",
    "weekday-checkbox",
    `${weekday}-unrestricted-${id}`
  );
  createButtonElement(
    `${weekday}-div-${id}`,
    "X",
    "remove-weekday-button",
    `remove-${weekday}-${id}`
  );

  //Creates the behavior to remove a weekday.
  createRemoveButtonResponse(weekday, id);

  //Validates the new input divs fields.
  validateWeekdayForm(weekday, id);

  //Adds checks for the unrestricted/blocked box.
  if (unrestricted) {
    $(`#${weekday}-unrestricted-${id}`).prop("checked", true);
    $(`#${weekday}-hr-${id}`).prop("disabled", true);
    $(`#${weekday}-min-${id}`).prop("disabled", true);
  } else if (blocked) {
    $(`#${weekday}-blocked-${id}`).prop("checked", true);
    $(`#${weekday}-hr-${id}`).prop("disabled", true);
    $(`#${weekday}-min-${id}`).prop("disabled", true);
  }
}

//Creates the whole sitelist.
function createSiteList(siteList) {
  for (let index = 0; index < siteList.length; index++) {
    createSite(siteList[index], index);
  }
}

//Creates an individual site.
function createSite(site, id = "") {
  createDiv("sites", "site-div", `site-div-${id}`);
  createParagraphElement(
    `site-div-${id}`,
    site.url,
    "site-names",
    `site-p${id}`
  );
  createButtonElement(
    `site-div-${id}`,
    "Remove",
    "remove-buttons",
    `site-remove-${id}`
  );
  createWeekDropdown(`site-div-${id}`, id);
  //Adds submit button.
  createButtonElement(`dropdown-${id}`, "Submit Changes", "btn btn-secondary btn-lg", `submit-edit-${id}`);
  //Hides the submit button by default.
  $(`#submit-edit-${id}`).hide();
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

//Creates a div specific to the weekday input forms.
function createWeekdayDiv(parentId = "", weekday, id) {
  const parent = document.getElementById(parentId);
  let div = document.createElement("div");
  div.className = `weekday-div`;
  div.id = `${weekday}-div-${id}`;
  insertWeekday(parent, div, weekdayToNumber(weekday), id);
}

//Finds the proper place to insert a weekday div.
function insertWeekday(parent, weekdayDiv, day, id) {
  const childNodes = Array.apply(null, parent.childNodes);
  const divRegex = /(\w+)-div-\d*/;
  const filterNodes = childNodes.filter((node) => divRegex.test(node.id));
  const childIds = filterNodes.map((node) =>
    weekdayToNumber(divRegex.exec(node.id)[1])
  );
  for (let index = 0; index < childIds.length; index++) {
    if (day < childIds[index]) {
      parent.insertBefore(
        weekdayDiv,
        document.getElementById(`${WEEKDAYS[childIds[index]]}-div-${id}`)
      );
      return;
    }
  }
  parent.appendChild(weekdayDiv);
  //Adds the submit button when adding the first element.
  if(childIds.length == 0) {
    if(document.getElementById(`submit-edit-${id}`) != null) {
      $(`#submit-edit-${id}`).show();
    }
  }
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
    for (let index = 0; index < additionalAttributes.length; index++) {
      button.setAttribute(
        additionalAttributes[index].property,
        additionalAttributes[index].value
      );
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
    $(`#${WEEKDAYS[day]}-hr-${id}`).val("");
    $(`#${WEEKDAYS[day]}-min-${id}`).val("");
    $(`#${WEEKDAYS[day]}-blocked-${id}`).prop("checked", false);
    $(`#${WEEKDAYS[day]}-unrestricted-${id}`).prop("checked", false);
    $(`#${WEEKDAYS[day]}-hr-${id}`).prop("disabled", false);
    $(`#${WEEKDAYS[day]}-min-${id}`).prop("disabled", false);
  }
}

//Handles incorrect min/max on inputs.
//Also handles the checkbox graphics.
function validateWeekdayForm(weekday, id = "") {
  //Code from stack overflow to handle incorrectly min/max on inputs.
  $(`#${weekday}-hr-${id}`).keydown(function () {
    // Save old value.
    if (
      !$(this).val() ||
      (parseInt($(this).val()) <= 23 && parseInt($(this).val()) >= 0)
    )
      $(this).data(`old-hr-${id}`, $(this).val());
  });
  $(`#${weekday}-hr-${id}`).keyup(function () {
    // Check correct, else revert back to old value.
    if (
      !$(this).val() ||
      (parseInt($(this).val()) <= 23 && parseInt($(this).val()) >= 0)
    );
    else $(this).val($(this).data(`old-hr-${id}`));
  });
  $(`#${weekday}-min-${id}`).keydown(function () {
    if (
      !$(this).val() ||
      (parseInt($(this).val()) <= 59 && parseInt($(this).val()) >= 0)
    )
      $(this).data(`old-min-${id}`, $(this).val());
  });
  $(`#${weekday}-min-${id}`).keyup(function () {
    if (
      !$(this).val() ||
      (parseInt($(this).val()) <= 59 && parseInt($(this).val()) >= 0)
    );
    else $(this).val($(this).data(`old-min-${id}`));
  });

  //Checkbox details.
  $(`#${weekday}-unrestricted-${id}`).click(function () {
    //If it is checked.
    if ($(`#${weekday}-unrestricted-${id}`).is(":checked")) {
      $(`#${weekday}-blocked-${id}`).prop("checked", false);
      $(`#${weekday}-hr-${id}`).prop("disabled", true);
      $(`#${weekday}-min-${id}`).prop("disabled", true);
    }
    //It is unchecked.
    else {
      $(`#${weekday}-hr-${id}`).prop("disabled", false);
      $(`#${weekday}-min-${id}`).prop("disabled", false);
    }
  });
  //Repeat with blocked checkbox.
  $(`#${weekday}-blocked-${id}`).click(function () {
    if ($(`#${weekday}-blocked-${id}`).is(":checked")) {
      $(`#${weekday}-unrestricted-${id}`).prop("checked", false);
      $(`#${weekday}-hr-${id}`).prop("disabled", true);
      $(`#${weekday}-min-${id}`).prop("disabled", true);
    } else {
      $(`#${weekday}-hr-${id}`).prop("disabled", false);
      $(`#${weekday}-min-${id}`).prop("disabled", false);
    }
  });
}

//Creates actionable items on siteList
function createSiteButtonResponse(siteList) {
  for (let index = 0; index < siteList.length; index++) {
    $(`#site-edit-${index}`).click(function () {
      bkg.console.log(`Edit: ${index}`);
      siteList[index].time = getTimesByWeekday(index);
      chrome.storage.sync.set({ timeList: siteList }, function () {
        bkg.console.log("SiteList Set");
      });
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

//Creates the remove response for removal buttons.
function createRemoveButtonResponse(weekday, id = "") {
  $(`#remove-${weekday}-${id}`).click(function () {
    $(`#${weekday}-div-${id}`).remove();
  });
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

//Converts the weekday string to an index.
function weekdayToNumber(weekday) {
  const day = weekday.toLowerCase();
  switch (day) {
    case "sunday":
      return 0;
    case "monday":
      return 1;
    case "tuesday":
      return 2;
    case "wednesday":
      return 3;
    case "thursday":
      return 4;
    case "friday":
      return 5;
    case "saturday":
      return 6;
    default:
      return -1;
  }
}
