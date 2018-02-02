var parentView = Backbone.View.extend({
  initialize: function(params){
	//	this.params = params || {};
	this.childMethod();
  },
  
  parentMethod: function(){
	console.log('parentMethod');
  }
});

var childView = parentView.extend({
  initialize: function(params){
		parentView.prototype.initialize.apply(this, arguments);	
		
		
	 
  },

  childMethod: function(){
	console.log('childMethod');
  }
});


// У всех дочерних вьюх есть доступ к функциям родителя через this
// Но нет доступа к функциям потомков
// Чтобы передать все функции дочерних вьюх к главной вьюхе
// Нужно использовать View.prototype.initialize.apply(this);
// arguments - параметры при создании экземпляра класса
// Так мы можем передать параметр родителю
var child2View = parentView.extend({
  initialize: function(params){
		parentView.prototype.initialize.apply(this, arguments);
		//console.log(params);
  },

  childchildMethod: function(msg){
	console.log('childchildMethod msg - '+msg);
  }
});

new child2View({
	first: 1,
	second: 2 
});