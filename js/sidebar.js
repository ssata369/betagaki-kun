(function(){


function initializeSidebar(){



    const parts =

    document.querySelectorAll(

        ".part"

    );







    parts.forEach(part=>{



        part.draggable=true;







        part.addEventListener(

            "dragstart",

            function(e){



                const type =

                part.dataset.type;







                if(window.setNewPartDrag){



                    setNewPartDrag(

                        type

                    );



                }







                e.dataTransfer.setData(

                    "partType",

                    type

                );



            }

        );







        part.onclick=function(){



            if(window.addPart){



                addPart(

                    part.dataset.type

                );



            }



        };



    });



}









window.initializeSidebar =

initializeSidebar;



})();