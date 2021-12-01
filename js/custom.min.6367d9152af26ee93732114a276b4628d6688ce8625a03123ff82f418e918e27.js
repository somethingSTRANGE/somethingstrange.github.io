var bufObj={},ShProg={},prog,canvas,textureObj,maskTextureObj,gl,myGif,inputBrightness,inputCurvature,inputScanlineOpacity,inputVignetteOpacity,inputVignetteRoundness,inputDistortion,inputColorShift,inputStripes,spanFrameCount,frameCount,VertexBuffer,Texture;const gifURL="/image/crt/Super_Mario_Bros__Speedrun_level_1__1_370_World_Record.gif";setTimeout(()=>{myGif=GIF(),myGif.onerror=function(a){console.log("Gif loading error "+a.type)},myGif.load(gifURL)},0),frameCount=0;function drawInfo(a,c=-1,d=-1){var e=4,b=11,f;b=a.height-5,c>=0&&(d<=0?drawText("GIF loading frame "+c,e,b):(f=Math.log(d)*Math.LOG10E+1|0,drawText(("   "+c).slice(-f)+" / "+d,e,b))),drawText(a.width+" x "+a.height,a.width-4,b,"right")}function drawText(a,b,c,d="left"){gl.font='8px C64 Pro Mono',gl.textAlign=d,gl.lineWidth=2,gl.strokeStyle="black",gl.strokeText(a,b+.5,c),gl.strokeText(a,b+.5,c+1),gl.strokeText(a,b+.5,c+2),gl.fillStyle="white",gl.fillText(a,b,c)}function render(n){var b,k,l,a,d;let m=1.2;const c=3.25,j=.25,e=1,f=1,g=20/100,h=0/1e3,i=0/100;gl.viewport(0,0,canvas.width,canvas.height),gl.enable(gl.DEPTH_TEST),gl.clearColor(0,0,0,1),gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT),b=0,gl.activeTexture(gl.TEXTURE0+b),k=[canvas.width,canvas.height],myGif?myGif.loading?myGif.lastFrame!==null&&(d=myGif.lastFrame.image,a=gl.createTexture(),gl.bindTexture(gl.TEXTURE_2D,a),gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,myGif.lastFrame.image),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR)):(l=myGif.image,a=gl.createTexture(),gl.bindTexture(gl.TEXTURE_2D,a),gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,myGif.image),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR)):ctx.fillText("Waiting for GIF image ",4,11),ShProg.Use(progDraw),ShProg.SetF2(progDraw,"screenResolution",[180,135]),ShProg.SetI1(progDraw,"u_texture",b),ShProg.SetF2(progDraw,"u_curvature",[c,c]),ShProg.SetF1(progDraw,"brightness",m),ShProg.SetF2(progDraw,"scanLineOpacity",[0,j]),ShProg.SetF1(progDraw,"vignetteOpacity",e),ShProg.SetF1(progDraw,"vignetteRoundness",f),ShProg.SetF1(progDraw,"u_distortion",g),ShProg.SetF1(progDraw,"u_stripe",i),ShProg.SetF1(progDraw,"u_rgbshift",h),VertexBuffer.Draw(bufRect),requestAnimationFrame(render)}function resize(){vp_size=[window.innerWidth,window.innerHeight],canvas.width=vp_size[0],canvas.height=vp_size[1]}function vertexShader(){return`
        precision mediump float;
        attribute vec2 inPos;
        varying   vec2 vertPos;
        varying vec2 vUV;
        void main()
        {
            vertPos     = inPos;
            vUV = inPos;
            gl_Position = vec4( inPos, 0.0, 1.0 );
        }
    `}function fragmentShader(){return`
    precision mediump float;
    varying vec2      vertPos;
    uniform sampler2D u_texture;
    uniform float     u_distortion;
    uniform float     u_stripe;
    uniform float     u_rgbshift;

    // Samplers
    varying vec2 vUV;
    uniform sampler2D textureSampler;

    // Parameters
    uniform float brightness;
    uniform vec2 u_curvature;
    uniform vec2 screenResolution;
    uniform vec2 scanLineOpacity;
    uniform float vignetteOpacity;
    uniform float vignetteRoundness;

    // Constants
    float PI = 3.1415926538;

    vec2 curveRemapUV(vec2 uv)
    {
        // as we near the edge of our screen apply greater distortion using a sinusoid.

        // uv = uv * 2.0 - 1.0;
        vec2 offset = abs(uv.yx) / vec2(u_curvature.x, u_curvature.y);
        uv = uv + uv * offset * offset;
        uv = uv * 0.5 + 0.5;
        return uv;
    }

    vec4 scanLineIntensity(float uv, float resolution, float opacity)
    {
        float intensity = sin(uv * resolution * PI * 0.5);
        intensity = ((0.5 * intensity) + 0.5) * 0.9 + 0.1;
        return vec4(vec3(pow(intensity, opacity)), 1.0);
    }

    vec4 vignetteIntensity(vec2 uv, vec2 resolution, float opacity, float roundness)
    {
        float intensity = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
        return vec4(vec3(clamp(pow((resolution.x / roundness) * intensity, opacity), 0.0, 1.0)), 1.0);
    }

    void main() 
    {
        vec2 remappedUV = curveRemapUV(vec2(vUV.x, vUV.y));
        vec4 baseColor = texture2D(textureSampler, remappedUV);

        baseColor *= vignetteIntensity(remappedUV, screenResolution, vignetteOpacity, vignetteRoundness);

        baseColor *= scanLineIntensity(remappedUV.x, screenResolution.y, scanLineOpacity.x);
        baseColor *= scanLineIntensity(remappedUV.y, screenResolution.x, scanLineOpacity.y);

        baseColor *= vec4(vec3(brightness), 1.0);

        if (remappedUV.x < 0.0 || remappedUV.y < 0.0 || remappedUV.x > 1.0 || remappedUV.y > 1.0){
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        } else {
            gl_FragColor = baseColor;
        }
    }

    void main1()
    {
        // distortion
        vec2 ndc_pos = vertPos;
        vec2 testVec = ndc_pos.xy / max(abs(ndc_pos.x), abs(ndc_pos.y));
        float len = max(1.0,length( testVec ));
        ndc_pos *= mix(1.0, mix(1.0,len,max(abs(ndc_pos.x), abs(ndc_pos.y))), u_distortion);
        vec2 texCoord = vec2(ndc_pos.s, -ndc_pos.t) * 0.5 + 0.5;
        // stripes
        float stripTile = texCoord.t * mix(10.0, 100.0, u_stripe);
        float stripFac = 1.0 + 0.25 * u_stripe * (step(0.5, stripTile-float(int(stripTile))) - 0.5);
        // rgb shift
        float texR = texture2D( u_texture, texCoord.st-vec2(u_rgbshift) ).r;
        float texG = texture2D( u_texture, texCoord.st ).g;
        float texB = texture2D( u_texture, texCoord.st+vec2(u_rgbshift) ).b;
        float clip = step(0.0, texCoord.s) * step(texCoord.s, 1.0) * step(0.0, texCoord.t) * step(texCoord.t, 1.0); 
        gl_FragColor  = vec4( vec3(texR, texG, texB) * stripFac * clip, 1.0 );
    }
    `}function init(){var a,b,c,d,e;if(console.log("INIT CALLED"),canvas=document.getElementById("retro-canvas"),gl=canvas.getContext("webgl2"),!gl){console.log("NO GL CONTEXT");return}a=128,b=128,c=[];for(ix=0;ix<a;++ix)for(iy=0;iy<b;++iy)d=Math.sin(Math.PI*6*ix/a),e=Math.sin(Math.PI*6*iy/b),c.push(128+127*d,63,128+127*e,255);if(textureObj=Texture.LoadTexture2D("https://upload.wikimedia.org/wikipedia/commons/a/a2/Wax_fire.gif"),progDraw=ShProg.Create([{source:vertexShader(),stage:gl.VERTEX_SHADER},{source:fragmentShader(),stage:gl.FRAGMENT_SHADER}]),progDraw.inPos=gl.getAttribLocation(progDraw.progObj,"inPos"),progDraw.progObj==0)return;bufRect=VertexBuffer.Create([{data:[-1,-1,1,-1,1,1,-1,1],attrSize:2,attrLoc:progDraw.inPos}],[0,1,2,0,2,3]),window.onresize=resize,resize(),requestAnimationFrame(render)}ShProg={Create:function(e){for(var g=[],d=0,f,a,h,b,c,i;d<e.length;++d)f=this.Compile(e[d].source,e[d].stage),f&&g.push(f);if(a={},a.progObj=this.Link(g),a.progObj){a.attrInx={},h=gl.getProgramParameter(a.progObj,gl.ACTIVE_ATTRIBUTES);for(b=0;b<h;++b)c=gl.getActiveAttrib(a.progObj,b).name,a.attrInx[c]=gl.getAttribLocation(a.progObj,c);a.uniLoc={},i=gl.getProgramParameter(a.progObj,gl.ACTIVE_UNIFORMS);for(b=0;b<i;++b)c=gl.getActiveUniform(a.progObj,b).name,a.uniLoc[c]=gl.getUniformLocation(a.progObj,c)}return a},AttrI:function(a,b){return a.attrInx[b]},UniformL:function(a,b){return a.uniLoc[b]},Use:function(a){gl.useProgram(a.progObj)},SetI1:function(a,b,c){a.uniLoc[b]&&gl.uniform1i(a.uniLoc[b],c)},SetF1:function(a,b,c){a.uniLoc[b]&&gl.uniform1f(a.uniLoc[b],c)},SetF2:function(a,b,c){a.uniLoc[b]&&gl.uniform2fv(a.uniLoc[b],c)},SetF3:function(a,b,c){a.uniLoc[b]&&gl.uniform3fv(a.uniLoc[b],c)},SetF4:function(a,b,c){a.uniLoc[b]&&gl.uniform4fv(a.uniLoc[b],c)},SetM33:function(a,b,c){a.uniLoc[b]&&gl.uniformMatrix3fv(a.uniLoc[b],!1,c)},SetM44:function(a,b,c){a.uniLoc[b]&&gl.uniformMatrix4fv(a.uniLoc[b],!1,c)},Compile:function(b,e){var c=document.getElementById(b),a,d;return c&&(b=c.text),a=gl.createShader(e),gl.shaderSource(a,b),gl.compileShader(a),d=gl.getShaderParameter(a,gl.COMPILE_STATUS),d||alert(gl.getShaderInfoLog(a)),d?a:null},Link:function(c){for(var a=gl.createProgram(),b=0;b<c.length;++b)gl.attachShader(a,c[b]);return gl.linkProgram(a),status=gl.getProgramParameter(a,gl.LINK_STATUS),status||alert(gl.getProgramInfoLog(a)),status?a:null}},VertexBuffer={Create:function(b,d,e){for(var c={buf:[],attr:[],inx:gl.createBuffer(),inxLen:d.length,primitive_type:e||gl.TRIANGLES},a=0;a<b.length;++a)c.buf.push(gl.createBuffer()),c.attr.push({size:b[a].attrSize,loc:b[a].attrLoc,no_of:b[a].data.length/b[a].attrSize}),gl.bindBuffer(gl.ARRAY_BUFFER,c.buf[a]),gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(b[a].data),gl.STATIC_DRAW);return gl.bindBuffer(gl.ARRAY_BUFFER,null),c.inxLen>0&&(gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,c.inx),gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(d),gl.STATIC_DRAW),gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null)),c},Draw:function(a){for(var b=0;b<a.buf.length;++b)gl.bindBuffer(gl.ARRAY_BUFFER,a.buf[b]),gl.vertexAttribPointer(a.attr[b].loc,a.attr[b].size,gl.FLOAT,!1,0,0),gl.enableVertexAttribArray(a.attr[b].loc);a.inxLen>0?(gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,a.inx),gl.drawElements(a.primitive_type,a.inxLen,gl.UNSIGNED_SHORT,0),gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null)):gl.drawArrays(a.primitive_type,0,a.attr[0].no_of);for(b=0;b<a.buf.length;++b)gl.disableVertexAttribArray(a.attr[b].loc);gl.bindBuffer(gl.ARRAY_BUFFER,null)}},Texture={},Texture.HandleLoadedTexture2D=function(c,a,b){return gl.activeTexture(gl.TEXTURE0),gl.bindTexture(gl.TEXTURE_2D,a),gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,b!=void 0&&b==!0),gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE),gl.bindTexture(gl.TEXTURE_2D,null),a},Texture.LoadTexture2D=function(b){var a=gl.createTexture();return a.image=new Image,a.image.setAttribute('crossorigin','anonymous'),a.image.onload=function(){Texture.HandleLoadedTexture2D(a.image,a,!0)},a.image.src=b,a},window.onload=function(){init()};const GIF=function(){var F=[0,4,2,1],q=[8,8,4,2],h,b,n,e,c,f,x,a;const d={GCExt:249,COMMENT:254,APPExt:255,UNKNOWN:1,IMAGE:44,EOF:59,EXT:33};x=function(b){this.data=new Uint8ClampedArray(b),this.pos=0;var a=this.data.length;this.getString=function(b){for(var a="";b--;)a+=String.fromCharCode(this.data[this.pos++]);return a},this.readSubBlocks=function(){var b,c,d="";do for(c=b=this.data[this.pos++];c--;)d+=String.fromCharCode(this.data[this.pos++]);while(b!==0&&this.pos<a)return d},this.readSubBlocksB=function(){var b,c,d=[];do for(c=b=this.data[this.pos++];c--;)d.push(this.data[this.pos++]);while(b!==0&&this.pos<a)return d}};function w(i,o){var b,m,h,d,k,e,j,a,c,g,l,n;for(h=m=0,a=[],d=1<<i,k=d+1,e=i+1,j=!1;!j;){g=c,c=0;for(b=0;b<e;b++)o[h>>3]&1<<(h&7)&&(c|=1<<b),h++;if(c===d){a=[],e=i+1;for(b=0;b<d;b++)a[b]=[b];a[d]=[],a[k]=null}else{if(c===k){j=!0;return}c>=a.length?a.push(a[g].concat(a[g][0])):g!==d&&a.push(a[g].concat(a[c][0])),l=a[c],n=l.length;for(b=0;b<n;b++)f[m++]=l[b];a.length===1<<e&&e<12&&e++}}}function l(d){for(var a=[],c=0;c<d;c++)a.push([b.data[b.pos++],b.data[b.pos++],b.data[b.pos++]]);return a}function u(){var c;b.pos+=6,a.width=b.data[b.pos++]+(b.data[b.pos++]<<8),a.height=b.data[b.pos++]+(b.data[b.pos++]<<8),c=b.data[b.pos++],a.colorRes=(c&112)>>4,a.globalColourCount=1<<(c&7)+1,a.bgColourIndex=b.data[b.pos++],b.pos++,c&128&&(a.globalColourTable=l(a.globalColourCount)),setTimeout(m,0)}function r(){b.pos+=1,'NETSCAPE'===b.getString(8)?b.pos+=8:(b.pos+=3,b.readSubBlocks())}function o(){var c;b.pos++,c=b.data[b.pos++],a.disposalMethod=(c&28)>>2,a.transparencyGiven=!!(c&1),a.delayTime=b.data[b.pos++]+(b.data[b.pos++]<<8),a.transparencyIndex=b.data[b.pos++],b.pos++}function p(){var h,d,g;h=function(b){var g,d,a,h;g=c/b,d=0,n!==c&&(e=new Uint8Array(c),n=c);for(a=0;a<4;a++)for(toLine=F[a];toLine<g;toLine+=q[a])e.set(f.subArray(d,d+b),toLine*b),d+=b},d={},a.frames.push(d),d.disposalMethod=a.disposalMethod,d.time=a.length,d.delay=a.delayTime*10,a.length+=d.delay,a.transparencyGiven?d.transparencyIndex=a.transparencyIndex:d.transparencyIndex=void 0,d.leftPos=b.data[b.pos++]+(b.data[b.pos++]<<8),d.topPos=b.data[b.pos++]+(b.data[b.pos++]<<8),d.width=b.data[b.pos++]+(b.data[b.pos++]<<8),d.height=b.data[b.pos++]+(b.data[b.pos++]<<8),g=b.data[b.pos++],d.localColourTableFlag=!!(g&128),d.localColourTableFlag&&(d.localColourTable=l(1<<(g&7)+1)),c!==d.width*d.height&&(f=new Uint8Array(d.width*d.height),c=d.width*d.height),w(b.data[b.pos++],b.readSubBlocksB()),g&64?(d.interlaced=!0,h(d.width)):d.interlaced=!1,G(d)}function G(b){var n,j,d,o,c,l,g,m,i,h,b,p;b.image=document.createElement('canvas'),b.image.width=a.width,b.image.height=a.height,b.image.ctx=b.image.getContext("2d"),n=b.localColourTableFlag?b.localColourTable:a.globalColourTable,a.lastFrame===null&&(a.lastFrame=b),l=!!(a.lastFrame.disposalMethod===2||a.lastFrame.disposalMethod===3),l||b.image.ctx.drawImage(a.lastFrame.image,0,0,a.width,a.height),j=b.image.ctx.getImageData(b.leftPos,b.topPos,b.width,b.height),p=b.transparencyIndex,d=j.data,b.interlaced?i=e:i=f,o=i.length,c=0;for(g=0;g<o;g++)m=i[g],h=n[m],p!==m?(d[c++]=h[0],d[c++]=h[1],d[c++]=h[2],d[c++]=255):l?(d[c+3]=0,c+=4):c+=4;b.image.ctx.putImageData(j,b.leftPos,b.topPos),a.lastFrame=b,!a.waitTillDone&&typeof a.onload=="function"&&k()}function i(){a.loading=!1,a.frameCount=a.frames.length,a.lastFrame=null,b=void 0,a.complete=!0,a.disposalMethod=void 0,a.transparencyGiven=void 0,a.delayTime=void 0,a.transparencyIndex=void 0,a.waitTillDone=void 0,f=void 0,e=void 0,c=void 0,e=void 0,a.currentFrame=0,a.frames.length>0&&(a.image=a.frames[0].image),k(),typeof a.onloadall=="function"&&a.onloadall.bind(a)({type:'loadall',path:[a]}),a.playOnLoad&&a.play()}function s(){i(),typeof a.cancelCallback=="function"&&a.cancelCallback.bind(a)({type:'canceled',path:[a]})}function t(){const c=b.data[b.pos++];c===d.GCExt?o():c===d.COMMENT?a.comment+=b.readSubBlocks():c===d.APPExt?r():(c===d.UNKNOWN&&(b.pos+=13),b.readSubBlocks())}function m(){if(a.cancel!==void 0&&a.cancel===!0){s();return}const c=b.data[b.pos++];if(c===d.IMAGE){if(p(),a.firstFrameOnly){i();return}}else if(c===d.EOF){i();return}else t();typeof a.onprogress=="function"&&a.onprogress({bytesRead:b.pos,totalBytes:b.data.length,frame:a.frames.length}),setTimeout(m,0)}function v(b){return!a.complete&&(a.cancelCallback=b,a.cancel=!0,!0)}function j(b){typeof a.onerror=="function"&&a.onerror.bind(this)({type:b,path:[this]}),a.onload=a.onerror=void 0,a.loading=!1}function k(){a.currentFrame=0,a.nextFrameAt=a.lastFrameAt=(new Date).valueOf(),typeof a.onload=="function"&&a.onload.bind(a)({type:'load',path:[a]}),a.onerror=a.onload=void 0}function y(a){b=new x(a),u()}function z(b){var a=new XMLHttpRequest;a.responseType="arraybuffer",a.onload=function(b){b.target.status===404?j("File not found"):b.target.status>=200&&b.target.status<300?y(a.response):j("Loading error : "+b.target.status)},a.open('GET',b,!0),a.send(),a.onerror=function(a){j("File error")},this.src=b,this.loading=!0}function A(){a.playing||(a.paused=!1,a.playing=!0,g())}function B(){a.paused=!0,a.playing=!1,clearTimeout(h)}function C(){a.paused||!a.playing?a.play():a.pause()}function D(b){clearTimeout(h),a.currentFrame=b%a.frames.length,a.playing?g():a.image=a.frames[a.currentFrame].image}function E(b){clearTimeout(h),b<0&&(b=0),b*=1e3,b%=a.length;for(var c=0;b>a.frames[c].time+a.frames[c].delay&&c<a.frames.length;)c+=1;a.currentFrame=c,a.playing?g():a.image=a.frames[a.currentFrame].image}function g(){var c,b;if(a.playSpeed===0){a.pause();return}a.playSpeed<0?(a.currentFrame-=1,a.currentFrame<0&&(a.currentFrame=a.frames.length-1),b=a.currentFrame,b-=1,b<0&&(b=a.frames.length-1),c=-a.frames[b].delay*1/a.playSpeed):(a.currentFrame+=1,a.currentFrame%=a.frames.length,c=a.frames[a.currentFrame].delay*1/a.playSpeed),a.image=a.frames[a.currentFrame].image,h=setTimeout(g,c)}return a={onload:null,onerror:null,onprogress:null,onloadall:null,paused:!1,playing:!1,waitTillDone:!0,loading:!1,firstFrameOnly:!1,width:null,height:null,frames:[],comment:"",length:0,currentFrame:0,frameCount:0,playSpeed:1,lastFrame:null,image:null,playOnLoad:!0,load:z,cancel:v,play:A,pause:B,seek:E,seekFrame:D,togglePlay:C},a}