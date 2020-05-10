let re = /([a-zA-Z-]*\.)+\w*/;
let old_url = 'https://www.secure.ru-ne-scape.com/m=hiscore_oldschool/overall?category_type=0.html';
let trimmed_url = re.exec(old_url);
console.log(trimmed_url);