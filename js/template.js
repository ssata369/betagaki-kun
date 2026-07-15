(function(){


const state = window.PageForgeState;



function initializeTemplate(){


    renderTemplateList();


}









function saveTemplate(){



    const name =

    prompt(

        "テンプレート名を入力してください"

    );



    if(!name){

        return;

    }






    const template = {



        id:

        createId(),



        name:

        name,



        created:

        new Date().toISOString(),



        sections:

        JSON.parse(

            JSON.stringify(

                state.sections

            )

        ),



        images:

        JSON.parse(

            JSON.stringify(

                state.images || []

            )

        )



    };







    let templates =

    JSON.parse(

        localStorage.getItem(

            "pageforge_templates"

        )

    ) || [];







    templates.push(

        template

    );







    localStorage.setItem(

        "pageforge_templates",

        JSON.stringify(

            templates

        )

    );







    renderTemplateList();



}









function loadTemplate(id){



    const templates =

    JSON.parse(

        localStorage.getItem(

            "pageforge_templates"

        )

    ) || [];







    const template =

    templates.find(

        t=>

        t.id===id

    );







    if(!template){

        return;

    }







    state.sections =

    JSON.parse(

        JSON.stringify(

            template.sections

        )

    );








    state.images =

    JSON.parse(

        JSON.stringify(

            template.images

        )

    );








    localStorage.setItem(

        "pageforge_images",

        JSON.stringify(

            state.images

        )

    );







    renderPageForge();



    renderTemplateList();



}









function deleteTemplate(id){



    let templates =

    JSON.parse(

        localStorage.getItem(

            "pageforge_templates"

        )

    ) || [];







    templates =

    templates.filter(

        t=>

        t.id!==id

    );







    localStorage.setItem(

        "pageforge_templates",

        JSON.stringify(

            templates

        )

    );







    renderTemplateList();



}









function renderTemplateList(){



    const area =

    document.getElementById(

        "templateList"

    );



    if(!area){

        return;

    }






    area.innerHTML="";







    const templates =

    JSON.parse(

        localStorage.getItem(

            "pageforge_templates"

        )

    ) || [];








    templates.forEach(template=>{



        const div =

        document.createElement("div");



        div.className=

        "template-item";







        div.innerHTML=`



<p>

${template.name}

</p>



<button class="load">

読込

</button>



<button class="delete">

削除

</button>



`;








        div.querySelector(".load")

        .onclick=()=>{



            loadTemplate(

                template.id

            );



        };







        div.querySelector(".delete")

        .onclick=()=>{



            deleteTemplate(

                template.id

            );



        };







        area.appendChild(

            div

        );



    });



}









function createId(){



    return (

        "tpl_" +

        Date.now()

    );



}







window.initializeTemplate=

initializeTemplate;



window.saveTemplate=

saveTemplate;



window.loadTemplate=

loadTemplate;



})();