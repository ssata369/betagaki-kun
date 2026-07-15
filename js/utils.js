(function(){

const PageForgeUtils = {

    createId:function(prefix){

        return (prefix || "pf") + "-" +
            Date.now().toString(36) +
            Math.random().toString(36).substring(2,8);

    },

    clone:function(obj){

        return JSON.parse(JSON.stringify(obj));

    }

};

function showToast(message){

    let toast = document.getElementById("pfToast");

    if(!toast){
        toast = document.createElement("div");
        toast.id = "pfToast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toast._timer);

    toast._timer = setTimeout(function(){
        toast.classList.remove("show");
    },2200);

}

window.PageForgeUtils = PageForgeUtils;

window.showToast = showToast;

})();
