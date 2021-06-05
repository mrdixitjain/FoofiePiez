$(document).ready(function(){
    //Delete the entry from the database when delete button clicked
    $(document).on('click',".remove",function () {
      let id = $(this).attr('id');      
      let obj = {did : id};
      console.log(obj);
      let str = "/remove/dish";					
      $.post(str, {obj}, (data) => {
        if(data !== 'done'){
          alert('Deletion Unsuccessful');
        }
        else{
          alert('Deletion Successful');            
          //$(main_div).remove();
          location.reload(true);
        }
      });
    });

    $(document).on('click', '#ad', (data) => {
      window.location.href="/logout";
    })
    $(document).on('click', '#ac', function() {
      let id= '#ac';
      let dish_name_id = '#aa'
      let dish_quantity_id = '#ab';
      let dish_price_id = '#ac';
      let r_id = $("h1").attr('id');
      
      let obj = {dish: $(dish_name_id).val(), quantity : $(dish_quantity_id).val(), price: $(dish_price_id).val(), rid: r_id};
      let str = "/add/dish";
        
      $.post(str, {obj,"hi":"don"}, (data) => {
        if(data !== 'done'){
          alert('Insertion Unsuccessful');
          location.reload(true);
        }
        else{
          alert('Insertion Successful');            
          location.reload(true);
        }
      });
    });
    //Block the entry from the database when delete button clicked
    $(document).on('click',".update",function () {
      let id = $(this).attr('id');
      let r_id = $("h1").attr('id');
      let did = id.slice(0,id.length-4);
      let dish_name_id = "#" + did + '1';
      let dish_price_id = dish_name_id + '23';
      let dish_volume_id = dish_name_id + '2';
      console.log(id, $(dish_name_id).val());
      let obj = {dishes: $(dish_name_id).val(), price: $(dish_price_id).val(), volume: $(dish_volume_id).val(), did: did};
      let str = "/update/dish";
      console.log(obj);
        
      $.post(str, {obj}, (data) => {
        if(data !== 'done'){
          alert('Updation Unsuccessful');
          location.reload(true);
        }
        else{
          alert('Updation Successful');            
          location.reload(true);
        }
      });				
    });
  });	