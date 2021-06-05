$(document).ready(()=>{
  $(document).on('click',".accept",function () {
    let oid = $(this).attr('id');						
    $.post("/accept-order", {oid: oid}, (data) => {
      if(data !== 'done'){
        alert('Unable to accept.\nPlease try again');
        location.reload(true);
      }
      else {
        console.log('Updation Successful');              
        location.reload(true);
      }
    });					
  });

  $(document).on('click',".reject",function () {
    let oid = $(this).attr('id');						
    $.post("/cancel-order", {oid: oid}, (data) => {
      if(data !== 'done'){
        alert('Unable to reject.\nPlease try again');
        location.reload(true);
      }
      else {
        console.log('Updation Successful');              
        location.reload(true);
      }
    });					
  });

  $(document).on('click',".picked",function () {
    let oid = $(this).attr('id');						
    $.post("/order-picked", {oid: oid}, (data) => {
      if(data !== 'done'){
        alert('Unable to Update.\nPlease try again');
        location.reload(true);
      }
      else {
        console.log('Updation Successful');              
        location.reload(true);
      }
    });					
  });
});