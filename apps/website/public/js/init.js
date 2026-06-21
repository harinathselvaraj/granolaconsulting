$(window).load(function() {

	getHeight();

	$('a[href*=#]').click(function() {
		if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'')
		&& location.hostname == this.hostname) {
		  var $target = $(this.hash);
		  $target = $target.length && $target
		  || $('[name=' + this.hash.slice(1) +']');
		  if ($target.length) {
			var targetOffset = $target.offset().top;
			$('html,body')
			.animate({scrollTop: targetOffset}, 1000);
		   return false;
		  }
		}
	  });
  
	
	
	$('#header').scrollToFixed({
		zIndex: 999
	});

});


$(window).resize(function() {
	getHeight();
});

function getHeight (){
	var winHeight = $(window).height();
		$('.introduction').css({'height': winHeight,});

	if ($(".menu-toggle").css("display") == "block" ){
		$('.menu-main-menu-container').css({'height': winHeight,});
	}else if ($(".menu-toggle").css("display") == "none" ){
		$('.menu-main-menu-container').css({'height': 'auto'});
	}
}

$(function(){
	$('.menu-toggle').on('click', function(e) {  
        $(this).toggleClass('is-active');
    });    
    
    $('.pod-text').matchHeight();
    
    // var feed = new Instafeed({
    //     get: 'user',
	// 	userId: 1210583888,
    //     accessToken: '1210583888.1677ed0.0595f4d946b64a078147615afefdab3b',
    //     limit: 6,
    //     resolution: 'low_resolution',
    //     template: '<a class="grid-2 m-grid-4 s-grid-6 {{type}}" href="{{link}}" target="_blank"><img src="{{image}}" /><span class="icon"></span></a>'
    // });
    // feed.run();
    
    
});


