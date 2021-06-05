
$(document).ready(() => {
    $(document).on('click', ".inc", function () {
        //prompt('Are you sure');
        let id=$(this).attr('id');
        let str="/cart-increment";
        $.post(str, {id: id}, (data) => {
        console.log(data)
        location.reload(true);
        })
    });

    $(document).on('click', ".dec", function () {
        //prompt('Are you sure');
        let id=$(this).attr('id');
        let str="/cart-decrement";
        $.post(str, {id:id}, (data)=>{
        console.log(data)
        location.reload(true);
        })
    });

    $(document).on('click', ".remove_button", function () {
        //prompt('Are you sure');
        let id=$(this).attr('id');
        let str="/cart-deletion";
        $.post(str, {id:id}, (data)=>{
        console.log(data)
        location.reload(true);
        })
    });
})