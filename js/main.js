var parentView = Backbone.View.extend({
  initialize: function(){
	console.log('parent');
	this.childMethod();
	this.childchildMethod();
	this.parentMethod();
	console.log(this._a);
	console.log(this._b);
  },
  
  parentMethod: function(){
	console.log('parentMethod');
  }
});

var childView = parentView.extend({
  initialize: function(){
	this._b = 2;
	 
	parentView.prototype.initialize.apply(this);
  },

  childMethod: function(){
	console.log('childMethod');
  }
});


// У всех дочерних вьюх есть доступ к функциям родителя через this
// Чтобы передать все функции дочерних вьюх к главной вьюхе
// Нужно использовать View.prototype.initialize.apply(this);
var childChildView = childView.extend({
  initialize: function(){
	  this._a = 1;	
	  this.parentMethod();
	  this.childMethod();
	  childView.prototype.initialize.apply(this);
	  this.childMethod();
	  this.parentMethod();
  },

  childchildMethod: function(){
	console.log('childchildMethod');
  }
});

new childChildView;