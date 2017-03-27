$(function(){

    var frameState = Backbone.Model.extend({
        defaults: {
            top: 100,
            left: 10,
            width: 200,
            height: 200,
            data: '',
            type: '',
            save_scale:false,
            scale:1
        },
        initialize: function(){
            if(this.get('save_scale')) {
                var self=this;
                var image = new Image();
                image.onload = function () {
                    var img_width=this.width,
                        img_height=this.height,
                        scale=img_height/img_width;
                    self.set('height',200*scale);
                    self.set('scale',scale);
                }
                image.src = this.get('data');
            }
        },
        move:function(dx,dy){
          var y=this.get('top')+dy,
              x=this.get('left')+dx;
          this.set({top:y,left:x});
        },
        resize:function(dx,dy,sx,sy){
            var dh=dy*sy,
                dw=dx*sx,
            old_h=this.get('height');
            var h=this.get('height')+dh,
                w=this.get('width')+dw,
                y=this.get('top'),
                x=this.get('left');
            if(this.get('save_scale')){
                //для пропорционального ресайза будем менять ширину
                h=w*this.get('scale');
                dy=old_h-h;
            }
            if(sx<0){
                x+=dx;
            }
            if(sy<0){
                y+=dy;
            }
            this.set({height:h,width:w,top:y,left:x});
        }
    });

    var frameView = Backbone.View.extend({
        template:_.template($('#frame_template').html()),
        events:{
            "mousedown .frame_content":"start_move",
            "touchstart .frame_content":"start_move",
            "mousedown .corner_point":"start_resize",
            "touchstart .corner_point":"start_move"
        },
        render: function() {
            var datatype=this.model.get("type");
            $('.frame_content',$(this.el)).css({
                'width': this.model.get("width")+'px',
                'height': this.model.get("height")+'px'
            });
            $(this.el).css({
                'top': this.model.get("top")+'px',
                'left': this.model.get("left")+'px',
                'position':'absolute'
            });
            return this;
        },
        initialize: function(){
            var el=$(this.el);
            el.html(this.template());
            el.attr('onselectstart','return false');
            $(".frame_content",el).attr('src',this.model.get('data'));
            $('body').bind('mouseup',{thisView : this}, this.stop_move);
            $('body').bind('touchend',{thisView : this}, this.stop_move);
            $(".corner_point",el).hover(function(){
                $.each($(".corner_point",el),function(){
                    $(this).addClass("hover");
                });
                $('.frame_content',el).addClass("hover");
            },function(){
                $.each($(".corner_point",el),function(){
                    $(this).removeClass("hover");
                });
                $('.frame_content',el).removeClass("hover");
            });
            this.render();
            this.listenTo(this.model, "change", this.render);
        },
        start_move: function(e){
            var model=this.model;
            var prevX=e.pageX,
                prevY=e.pageY;
            if(!prevX){
                prevX=e.targetTouches[0].pageX,
                prevY=e.targetTouches[0].pageY;
            }
            function calcMove(x,y){
                var dx = x - prevX,
                    dy = y - prevY;
                prevX += dx;
                prevY += dy;
                model.move(dx, dy);
            }
                this.el.onmousemove = function (e) {
                    calcMove(e.pageX,e.pageY);
                };
            $('body').bind('touchmove',  function (e) {
                calcMove(e.targetTouches[0].pageX, e.targetTouches[0].pageY);
            });
        },
        start_resize: function(e){
            var sx=$(e.target).attr('sx'),
                sy=$(e.target).attr('sy');
            var model=this.model;
            var prevX=e.pageX,
                prevY=e.pageY;
            if(!prevX){
                prevX=e.targetTouches[0].pageX,
                prevY=e.targetTouches[0].pageY;
            }
            function calcResize(x,y){
                var dx = x - prevX,
                    dy = y - prevY;
                prevX += dx;
                prevY += dy;
                model.resize(dx, dy,sx,sy);
            }
            window.onmousemove = function (e) {
                calcResize(e.pageX,e.pageY);
            };
            $('body').bind('touchmove',  function (e) {
                calcResize(e.targetTouches[0].pageX, e.targetTouches[0].pageY);
            });
        },
        stop_move:function(e){
            e.data.thisView.el.onmousemove=null;
            window.onmousemove = null;
            $('body').unbind('touchmove');
        }
    });

    var framesCollection = Backbone.Collection.extend({
        model:frameView
    });

    var cur_id=0;

    //добавление элемента в верстку и в коллекцию
    function addFrame(model_attrs){
        model_attrs.id=cur_id;
        cur_id++;
        var top=getBottomPoint();
        model_attrs.top=top+10;
        var frameModel = new frameState(model_attrs);
        var frame=new frameView({model:frameModel});
        frames.add(frameModel);
        $('body').append(frame.render().el);
    }

    //получение самой нижней точки всех элементов, чтобы следующий добавить еще ниже
    function getBottomPoint(){
        var tops=frames.pluck('top'),
            heights=frames.pluck('height');
        var max=100,
            cur_bot=0;
        for(var i=0;i<tops.length;i++){
            cur_bot=tops[i]+heights[i];
            if(cur_bot>max){
                max=cur_bot;
            }
        }
        return max;
    }

    var new_top = 100;
    var frames=new framesCollection();

    //загрузка картинки
    $(".input_image_btn").click(function(){
        $('#input_image').trigger('click');
    });
    $("#input_image").bind('change',function(e) {
        if (this.files && this.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
                addFrame({data:e.target.result,save_scale:true});
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
    //загрузка url video
    $(".input_video_btn").click(function() {
        $('.url_input').css({'display':'block'});
    });
    $("#btn_cancel").click(function() {
        $('.text_url')[0].value='';
        $('.url_input').css({'display':'none'});
    });
    $("#btn_ok").click(function() {
        var src=$('.text_url')[0].value;
        $('.url_input').css({'display':'none'});
        if(src) {
            var youtube_video_id = src.match(/youtube\.com.*(\?v=|\/embed\/)(.{11})/).pop();
            addFrame({
                data: 'http://img.youtube.com/vi/' + youtube_video_id + '/0.jpg',
                video_url: src
            });
        }
    });


});