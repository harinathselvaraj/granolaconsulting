$(window).load(function() {
			var paper = Snap("#svg");	
			var paper2 = Snap("#svg2");
		
			var p1 = paper.polyline(125, 0, 1640,0, 1000,800).attr({ id:"p1", fill: "#e0849e"});
			var p2 = paper.polyline(1640,0, 2000,0, 2000,1600, 1000,800).attr({fill: "#ffc120"});
			var p3 = paper.polyline(2000, 1600, 912,1600, 1000,800 ).attr({ fill: "#43b5b4"});
			var p4 = paper.polyline(912,1600, 0,1600, 0,0, 125,0, 1000,800).attr({ fill: "#66c5c6",});

			var spin5Start = [125, 0,125, 0,125, 0,1000,800];
			var spin5Finish = [0,162, 0, 0, 422, 0, 1000,800];
			var spin5 = paper.polygon(spin5Start);
			spin5.attr({id:"spin5", fill:"#5a687e"});
			spin5Func = function(){spin5.animate({"points":spin5Finish},200,mina.linear);}
			
			var spin6Start = [1640,0, 1640,0, 1000,800];
			var spin6Finish = [1434,0, 1932, 0, 1000,800];
			var spin6 = paper.polygon(spin6Start);
			spin6.attr({id:"spin6", fill:"#de6413"});
			spin6Func = function(){spin6.animate({"points":spin6Finish},200,mina.linear);}
		
			var spin7Start = [912, 1600, 912, 1600, 1000,800];
			var spin7Finish = [1134,1600, 804, 1600, 1000,800];
			var spin7 = paper.polygon(spin7Start);
			spin7.attr({id:"spin7", fill:"#1b8c8e"});
			spin7Func = function(){spin7.animate({"points":spin7Finish},200,mina.linear);}		
		
		
			var spin1Start = [1168,0, 0,0, 0,1168, 1000,800];
			var spin1Finish = [125,0, 125,0, 125,0, 1000,800];
			var spin1 = paper2.polygon(spin1Start);
			spin1.attr({id:"spin1", fill:"#F8F1E9"});
			spin1Func = function(){spin1.animate({"points":spin1Finish},600,mina.linear);}
		
			var spin2Start = [924,0, 2000,0, 2000,657, 1000,800];
			var spin2Finish = [1640,0, 1640,0, 1640,0, 1000,800];
			var spin2 = paper2.polygon(spin2Start);
			spin2.attr({id:"spin2",fill:"#F8F1E9"});
			spin2Func = function(){spin2.animate({"points":spin2Finish},500,mina.linear);}
			
			var spin3Start = [2000,653, 2000,1600, 1347,1600, 1000,800];
			var spin3Finish = [2000,1600, 2000,1600, 2000,1600, 1000,800];
			var spin3 = paper2.polygon(spin3Start);
			spin3.attr({id:"spin3",fill:"#F8F1E9"});
			spin3Func = function(){spin3.animate({"points":spin3Finish},700,mina.linear);}
			
			var spin4Start = [1354,1600, 0,1600, 0,1168, 1000,800];
			var spin4Finish = [912,1600, 912,1600, 912,1600, 1000,800];
			var spin4 = paper2.polygon(spin4Start);
			spin4.attr({id:"spin4",fill:"#F8F1E9"});
			spin4Func = function(){spin4.animate({"points":spin4Finish},500,mina.linear);}
			
			setTimeout(spin1Func, 1000);
			setTimeout(spin2Func, 1000);
			setTimeout(spin3Func, 1000);
			setTimeout(spin4Func, 1000);
			setTimeout(spin5Func, 1600);
			setTimeout(spin6Func, 1600);
			setTimeout(spin7Func, 1600);
});
