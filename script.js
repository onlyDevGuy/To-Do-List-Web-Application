const listContainer = document.getElementById("list-container");
const inputBox = document.getElementById("input-box");


function addTask(){
    if(inputBox.Value==''){
    alert("Enter Some Data");
} else{
 let li = document.createElement("li");
        li.innerHTML = inputBox.value;
        listContainer.appendChild(li);

let span = document.createElement("span");
        span.innerHTML = "/u00d7";
        li.appendChild(span);
}

    inputBox.value = "";
    saveTask();

}

saveTask()
    {localStorage.setItem("data",listContainer.innerHTML);
}

function showTask(){
    listContainer.innerHtml = localStorage.getItem("data");
}

listContainer.addEventListener("click", function(e) {
    if(e.target.tagName === "LI"){
    e.target.classList.toggle("checked");
    saveTask();

} else if(e.target.tagName === "span"){
    e.target.parentElement.remove();
    saveTask();
}
});
  
function saveTask(){
    localStorage.setItem("data",listConatiner.innerHtml);

}
function showTask(){
    listContainer.innerHTML = localStorage.getItem("data");
}

showTask(); 