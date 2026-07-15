(function(){


const state = window.PageForgeState;



function initializeSEO(){



    if(!state.seo){



        state.seo={



            title:"",

            description:"",

            keywords:"",

            ogImage:"",

            favicon:""



        };



    }



    renderSEOPanel();



}









function renderSEOPanel(){



    const panel=

    document.getElementById(

        "pageSetting"

    );



    if(!panel){

        return;

    }







    panel.innerHTML=`



<label>

title

</label>


<input

id="seoTitle"

value="${escapeHtml(state.seo.title)}"

>





<label>

description

</label>


<textarea

id="seoDescription">

${escapeHtml(state.seo.description)}

</textarea>







<label>

keywords

</label>


<input

id="seoKeywords"

value="${escapeHtml(state.seo.keywords)}"

>







<label>

OGP画像URL

</label>


<input

id="seoOgImage"

value="${escapeHtml(state.seo.ogImage)}"

>







<label>

favicon URL

</label>


<input

id="seoFavicon"

value="${escapeHtml(state.seo.favicon)}"

>



`;







bindEvents();



}









function bindEvents(){



const fields=[



"seoTitle",

"seoDescription",

"seoKeywords",

"seoOgImage",

"seoFavicon"



];







fields.forEach(id=>{



const el=

document.getElementById(id);



if(!el){

return;

}







el.onchange=function(){



const key =

id.replace(

"seo",

""

);



state.seo[

key.charAt(0).toLowerCase()

+

key.slice(1)

]

=

this.value;







if(window.saveAutoSave){



saveAutoSave();



}



};



});



}









function getSEO(){



return state.seo || {};



}









function escapeHtml(value){



return String(value)

.replace(/&/g,"&amp;")

.replace(/</g,"&lt;")

.replace(/>/g,"&gt;")

.replace(/"/g,"&quot;");



}









window.initializeSEO=

initializeSEO;



window.getSEO=

getSEO;



})();