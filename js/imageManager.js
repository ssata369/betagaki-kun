(function(){


const state = window.PageForgeState;



function initializeImageManager(){



    if(!state.images){



        state.images=[];



    }







    const input =

    document.getElementById(

        "imageUpload"

    );



    if(input){



        input.onchange=function(e){



            const files=

            Array.from(

                e.target.files

            );







            files.forEach(

                file=>uploadImage(file)

            );



        };



    }







    renderImageList();



}









function uploadImage(file){



const reader=

new FileReader();







reader.onload=function(e){



const image={



id:

createId(),



name:

file.name,



src:

e.target.result,



url:"",



created:

new Date().toISOString()



};







state.images.push(

image

);







saveImages();



saveAction();



renderImageList();



};







reader.readAsDataURL(

file

);



}









function renderImageList(){



const area=

document.getElementById(

"imageList"

);



if(!area){

return;

}







area.innerHTML="";







const search=

document.createElement(

"input"

);



search.placeholder=

"画像検索";



search.className=

"image-search";







area.appendChild(

search

);







const list=

document.createElement(

"div"

);



list.className=

"image-grid";







area.appendChild(

list

);







function draw(keyword=""){



list.innerHTML="";







state.images

.filter(

image=>

image.name

.toLowerCase()

.includes(

keyword.toLowerCase()

)

)

.forEach(

image=>{



list.appendChild(

createImageItem(image)

);



}

);



}







search.oninput=function(){



draw(

this.value

);



};







draw();



}









function createImageItem(image){



const item=

document.createElement(

"div"

);



item.className=

"image-item";



item.draggable=true;



item.dataset.src=

image.src;








const count=

getUseCount(

image.src

);







item.innerHTML=

`

<img src="${image.src}">



<p>

${image.name}

</p>



<p>

使用数：${count}

</p>



<input

class="image-url"

value="${image.url || ""}"

placeholder="画像URL"

>





<button class="use">

使用

</button>



<button class="delete">

削除

</button>

`;









item.querySelector(

".image-url"

)

.onchange=function(){



image.url=this.value;



saveImages();



};








item.querySelector(

".use"

)

.onclick=function(){



applyImage(

image.src

);



};








item.querySelector(

".delete"

)

.onclick=function(){



deleteImage(

image.id

);



};







return item;



}









function applyImage(src){



const block=

findSelectedBlock();



if(!block){

return;

}







block.image=

src;







saveAction();



renderPageForge();



}









function deleteImage(id){



const image=

state.images.find(

img=>

img.id===id

);



if(!image){

return;

}







const count=

getUseCount(

image.src

);







if(count>0){



const result=

confirm(

"この画像は使用中です。削除しますか？"

);



if(!result){

return;

}



}







state.images=

state.images.filter(

img=>

img.id!==id

);







saveImages();



saveAction();



renderImageList();



}









function getUseCount(src){



let count=0;







state.sections.forEach(

section=>{



section.blocks.forEach(

block=>{



if(block.image===src){



count++;



}



}

);



}

);



return count;



}









function findSelectedBlock(){



for(

const section of state.sections

){



const block=

section.blocks.find(

b=>

b.id===state.selectedId

);



if(block){

return block;

}



}



return null;



}









function saveImages(){



localStorage.setItem(

"pageforge_images",

JSON.stringify(

state.images

)

);



}









function saveAction(){



if(window.historySave){



historySave();



}



}









function createId(){



return (

"img_" +

Date.now() +

"_" +

Math.floor(

Math.random()*1000

)

);



}







window.initializeImageManager=

initializeImageManager;



})();