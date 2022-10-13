var canvas,gl,prog,bufObj={},textureObj,maskTextureObj,myGif,inputBrightness,inputCurvature,inputScanlineOpacity,inputVignetteOpacity,inputVignetteRoundness,inputDistortion,inputColorShift,inputStripes,VertexBuffer,Texture,ShProg={},frameCount=0;const gifURL="/image/crt/cthulhu.gif";setTimeout(()=>{myGif=GIF(),myGif.onerror=function(e){console.log("Gif loading error "+e.type)},myGif.load(gifURL)},0);function input(e,t){return e?e.value:t}function render(){let t,n;const s=0;gl.viewport(0,0,canvas.width,canvas.height),gl.enable(gl.DEPTH_TEST),gl.clearColor(0,0,0,1),gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT),gl.activeTexture(gl.TEXTURE0+s),myGif?myGif.loading?myGif.lastFrame!==null&&(t=myGif.lastFrame.image,n=gl.createTexture(),gl.bindTexture(gl.TEXTURE_2D,n),gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,t),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR)):(t=myGif.image,n=gl.createTexture(),gl.bindTexture(gl.TEXTURE_2D,n),gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,t),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR)):ctx.fillText("Waiting for GIF image ",4,11);let i=input(inputBrightness,1.2),o=input(inputCurvature,3.25),a=input(inputScanlineOpacity,.25),r=input(inputVignetteOpacity,1),c=input(inputVignetteRoundness,1),l=input(inputDistortion,20)/100,d=input(inputColorShift,0)/1e3,u=input(inputStripes,0)/100;ShProg.Use(progDraw),ShProg.SetF2(progDraw,"screenResolution",[180,135]),ShProg.SetI1(progDraw,"u_texture",s),ShProg.SetF1(progDraw,"brightness",i),ShProg.SetF2(progDraw,"u_curvature",[o,o]),ShProg.SetF2(progDraw,"scanLineOpacity",[0,a]),ShProg.SetF1(progDraw,"vignetteOpacity",r),ShProg.SetF1(progDraw,"vignetteRoundness",c),ShProg.SetF1(progDraw,"u_distortion",l),ShProg.SetF1(progDraw,"u_rgbshift",d),ShProg.SetF1(progDraw,"u_stripe",u),VertexBuffer.Draw(bufRect),requestAnimationFrame(render)}function vertexShader(){return`
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
    `}function init(){if(console.log("INIT CALLED"),canvas=document.getElementById("retro-canvas"),gl=canvas.getContext("webgl")||canvas.getContext("experimental-webgl"),!gl||!(gl instanceof WebGLRenderingContext)){console.log("NO GL CONTEXT");return}var n,s,e=128,t=128,o=[];for(ix=0;ix<e;++ix)for(iy=0;iy<t;++iy)n=Math.sin(Math.PI*6*ix/e),s=Math.sin(Math.PI*6*iy/t),o.push(128+127*n,63,128+127*s,255);if(textureObj=Texture.LoadTexture2D("https://upload.wikimedia.org/wikipedia/commons/a/a2/Wax_fire.gif"),progDraw=ShProg.Create([{source:vertexShader(),stage:gl.VERTEX_SHADER},{source:fragmentShader(),stage:gl.FRAGMENT_SHADER}]),progDraw.inPos=gl.getAttribLocation(progDraw.progObj,"inPos"),progDraw.progObj==0)return;bufRect=VertexBuffer.Create([{data:[-1,-1,1,-1,1,1,-1,1],attrSize:2,attrLoc:progDraw.inPos}],[0,1,2,0,2,3]),requestAnimationFrame(render)}ShProg={Create:function(e){for(var t,n,s,i,r,c,a=[],o=0;o<e.length;++o)i=this.Compile(e[o].source,e[o].stage),i&&a.push(i);if(t={},t.progObj=this.Link(a),t.progObj){t.attrInx={},r=gl.getProgramParameter(t.progObj,gl.ACTIVE_ATTRIBUTES);for(n=0;n<r;++n)s=gl.getActiveAttrib(t.progObj,n).name,t.attrInx[s]=gl.getAttribLocation(t.progObj,s);t.uniLoc={},c=gl.getProgramParameter(t.progObj,gl.ACTIVE_UNIFORMS);for(n=0;n<c;++n)s=gl.getActiveUniform(t.progObj,n).name,t.uniLoc[s]=gl.getUniformLocation(t.progObj,s)}return t},AttrI:function(e,t){return e.attrInx[t]},UniformL:function(e,t){return e.uniLoc[t]},Use:function(e){gl.useProgram(e.progObj)},SetI1:function(e,t,n){e.uniLoc[t]&&gl.uniform1i(e.uniLoc[t],n)},SetF1:function(e,t,n){e.uniLoc[t]&&gl.uniform1f(e.uniLoc[t],n)},SetF2:function(e,t,n){e.uniLoc[t]&&gl.uniform2fv(e.uniLoc[t],n)},SetF3:function(e,t,n){e.uniLoc[t]&&gl.uniform3fv(e.uniLoc[t],n)},SetF4:function(e,t,n){e.uniLoc[t]&&gl.uniform4fv(e.uniLoc[t],n)},SetM33:function(e,t,n){e.uniLoc[t]&&gl.uniformMatrix3fv(e.uniLoc[t],!1,n)},SetM44:function(e,t,n){e.uniLoc[t]&&gl.uniformMatrix4fv(e.uniLoc[t],!1,n)},Compile:function(e,t){var n,s,o=document.getElementById(e);return o&&(e=o.text),n=gl.createShader(t),gl.shaderSource(n,e),gl.compileShader(n),s=gl.getShaderParameter(n,gl.COMPILE_STATUS),s||alert(gl.getShaderInfoLog(n)),s?n:null},Link:function(e){for(var t=gl.createProgram(),n=0;n<e.length;++n)gl.attachShader(t,e[n]);return gl.linkProgram(t),status=gl.getProgramParameter(t,gl.LINK_STATUS),status||alert(gl.getProgramInfoLog(t)),status?t:null}},VertexBuffer={Create:function(e,t,n){for(var o={buf:[],attr:[],inx:gl.createBuffer(),inxLen:t.length,primitive_type:n||gl.TRIANGLES},s=0;s<e.length;++s)o.buf.push(gl.createBuffer()),o.attr.push({size:e[s].attrSize,loc:e[s].attrLoc,no_of:e[s].data.length/e[s].attrSize}),gl.bindBuffer(gl.ARRAY_BUFFER,o.buf[s]),gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(e[s].data),gl.STATIC_DRAW);return gl.bindBuffer(gl.ARRAY_BUFFER,null),o.inxLen>0&&(gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,o.inx),gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(t),gl.STATIC_DRAW),gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null)),o},Draw:function(e){for(var t=0;t<e.buf.length;++t)gl.bindBuffer(gl.ARRAY_BUFFER,e.buf[t]),gl.vertexAttribPointer(e.attr[t].loc,e.attr[t].size,gl.FLOAT,!1,0,0),gl.enableVertexAttribArray(e.attr[t].loc);e.inxLen>0?(gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,e.inx),gl.drawElements(e.primitive_type,e.inxLen,gl.UNSIGNED_SHORT,0),gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null)):gl.drawArrays(e.primitive_type,0,e.attr[0].no_of);for(t=0;t<e.buf.length;++t)gl.disableVertexAttribArray(e.attr[t].loc);gl.bindBuffer(gl.ARRAY_BUFFER,null)}},Texture={},Texture.HandleLoadedTexture2D=function(e,t,n){return gl.activeTexture(gl.TEXTURE0),gl.bindTexture(gl.TEXTURE_2D,t),gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,n!=null&&n==!0),gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,e),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE),gl.bindTexture(gl.TEXTURE_2D,null),t},Texture.LoadTexture2D=function(e){var t=gl.createTexture();return t.image=new Image,t.image.setAttribute("crossorigin","anonymous"),t.image.onload=function(){Texture.HandleLoadedTexture2D(t.image,t,!0)},t.image.src=e,t},window.onload=function(){init()};const GIF=function(){var e,t,n,o,i,r,d,u,T=[0,4,2,1],F=[8,8,4,2];const s={GCExt:249,COMMENT:254,APPExt:255,UNKNOWN:1,IMAGE:44,EOF:59,EXT:33};u=function(e){this.data=new Uint8ClampedArray(e),this.pos=0;var t=this.data.length;this.getString=function(e){for(var t="";e--;)t+=String.fromCharCode(this.data[this.pos++]);return t},this.readSubBlocks=function(){var e,n,s="";do for(n=e=this.data[this.pos++];n--;)s+=String.fromCharCode(this.data[this.pos++]);while(e!==0&&this.pos<t)return s},this.readSubBlocksB=function(){var e,n,s=[];do for(n=e=this.data[this.pos++];n--;)s.push(this.data[this.pos++]);while(e!==0&&this.pos<t)return s}};function O(e,t){l=m=0,n=[],a=1<<e,d=a+1,r=e+1,u=!1;for(var n,s,i,a,r,c,l,d,u,h,m,f;!u;){c=i,i=0;for(s=0;s<r;s++)t[l>>3]&1<<(l&7)&&(i|=1<<s),l++;if(i===a){n=[],r=e+1;for(s=0;s<a;s++)n[s]=[s];n[a]=[],n[d]=null}else{if(i===d){u=!0;return}i>=n.length?n.push(n[c].concat(n[c][0])):c!==a&&n.push(n[c].concat(n[i][0])),h=n[i],f=h.length;for(s=0;s<f;s++)o[m++]=h[s];n.length===1<<r&&r<12&&r++}}}function m(e){for(var n=[],s=0;s<e;s++)n.push([t.data[t.pos++],t.data[t.pos++],t.data[t.pos++]]);return n}function w(){var n;t.pos+=6,e.width=t.data[t.pos++]+(t.data[t.pos++]<<8),e.height=t.data[t.pos++]+(t.data[t.pos++]<<8),n=t.data[t.pos++],e.colorRes=(n&112)>>4,e.globalColourCount=1<<(n&7)+1,e.bgColourIndex=t.data[t.pos++],t.pos++,n&128&&(e.globalColourTable=m(e.globalColourCount)),setTimeout(f,0)}function y(){t.pos+=1,"NETSCAPE"===t.getString(8)?t.pos+=8:(t.pos+=3,t.readSubBlocks())}function v(){var n;t.pos++,n=t.data[t.pos++],e.disposalMethod=(n&28)>>2,e.transparencyGiven=!!(n&1),e.delayTime=t.data[t.pos++]+(t.data[t.pos++]<<8),e.transparencyIndex=t.data[t.pos++],t.pos++}function x(){var a,r=function(e){var t,r,a=n/e,s=0;d!==n&&(i=new Uint8Array(n),d=n);for(t=0;t<4;t++)for(toLine=T[t];toLine<a;toLine+=F[t])i.set(o.subArray(s,s+e),toLine*e),s+=e},s={};e.frames.push(s),s.disposalMethod=e.disposalMethod,s.time=e.length,s.delay=e.delayTime*10,e.length+=s.delay,e.transparencyGiven?s.transparencyIndex=e.transparencyIndex:s.transparencyIndex=void 0,s.leftPos=t.data[t.pos++]+(t.data[t.pos++]<<8),s.topPos=t.data[t.pos++]+(t.data[t.pos++]<<8),s.width=t.data[t.pos++]+(t.data[t.pos++]<<8),s.height=t.data[t.pos++]+(t.data[t.pos++]<<8),a=t.data[t.pos++],s.localColourTableFlag=!!(a&128),s.localColourTableFlag&&(s.localColourTable=m(1<<(a&7)+1)),n!==s.width*s.height&&(o=new Uint8Array(s.width*s.height),n=s.width*s.height),O(t.data[t.pos++],t.readSubBlocksB()),a&64?(s.interlaced=!0,r(s.width)):s.interlaced=!1,p(s)}function p(t){var t,n,s,a,r,c,l,d,u,m,f,p;t.image=document.createElement("canvas"),t.image.width=e.width,t.image.height=e.height,t.image.ctx=t.image.getContext("2d"),m=t.localColourTableFlag?t.localColourTable:e.globalColourTable,e.lastFrame===null&&(e.lastFrame=t),d=e.lastFrame.disposalMethod===2||e.lastFrame.disposalMethod===3,d||t.image.ctx.drawImage(e.lastFrame.image,0,0,e.width,e.height),l=t.image.ctx.getImageData(t.leftPos,t.topPos,t.width,t.height),p=t.transparencyIndex,s=l.data,t.interlaced?r=i:r=o,f=r.length,n=0;for(a=0;a<f;a++)u=r[a],c=m[u],p!==u?(s[n++]=c[0],s[n++]=c[1],s[n++]=c[2],s[n++]=255):d?(s[n+3]=0,n+=4):n+=4;t.image.ctx.putImageData(l,t.leftPos,t.topPos),e.lastFrame=t,!e.waitTillDone&&typeof e.onload=="function"&&h()}function l(){e.loading=!1,e.frameCount=e.frames.length,e.lastFrame=null,t=void 0,e.complete=!0,e.disposalMethod=void 0,e.transparencyGiven=void 0,e.delayTime=void 0,e.transparencyIndex=void 0,e.waitTillDone=void 0,o=void 0,i=void 0,n=void 0,i=void 0,e.currentFrame=0,e.frames.length>0&&(e.image=e.frames[0].image),h(),typeof e.onloadall=="function"&&e.onloadall.bind(e)({type:"loadall",path:[e]}),e.playOnLoad&&e.play()}function b(){l(),typeof e.cancelCallback=="function"&&e.cancelCallback.bind(e)({type:"canceled",path:[e]})}function j(){const n=t.data[t.pos++];n===s.GCExt?v():n===s.COMMENT?e.comment+=t.readSubBlocks():n===s.APPExt?y():(n===s.UNKNOWN&&(t.pos+=13),t.readSubBlocks())}function f(){if(e.cancel!==void 0&&e.cancel===!0){b();return}const n=t.data[t.pos++];if(n===s.IMAGE){if(x(),e.firstFrameOnly){l();return}}else if(n===s.EOF){l();return}else j();typeof e.onprogress=="function"&&e.onprogress({bytesRead:t.pos,totalBytes:t.data.length,frame:e.frames.length}),setTimeout(f,0)}function _(t){return!e.complete&&(e.cancelCallback=t,e.cancel=!0,!0)}function c(t){typeof e.onerror=="function"&&e.onerror.bind(this)({type:t,path:[this]}),e.onload=e.onerror=void 0,e.loading=!1}function h(){e.currentFrame=0,e.nextFrameAt=e.lastFrameAt=(new Date).valueOf(),typeof e.onload=="function"&&e.onload.bind(e)({type:"load",path:[e]}),e.onerror=e.onload=void 0}function g(e){t=new u(e),w()}function C(e){var t=new XMLHttpRequest;t.responseType="arraybuffer",t.onload=function(e){e.target.status===404?c("File not found"):e.target.status>=200&&e.target.status<300?g(t.response):c("Loading error : "+e.target.status)},t.open("GET",e,!0),t.send(),t.onerror=function(){c("File error")},this.src=e,this.loading=!0}function E(){e.playing||(e.paused=!1,e.playing=!0,a())}function k(){e.paused=!0,e.playing=!1,clearTimeout(r)}function A(){e.paused||!e.playing?e.play():e.pause()}function S(t){clearTimeout(r),e.currentFrame=t%e.frames.length,e.playing?a():e.image=e.frames[e.currentFrame].image}function M(t){clearTimeout(r),t<0&&(t=0),t*=1e3,t%=e.length;for(var n=0;t>e.frames[n].time+e.frames[n].delay&&n<e.frames.length;)n+=1;e.currentFrame=n,e.playing?a():e.image=e.frames[e.currentFrame].image}function a(){var t,n;e.playSpeed===0?e.pause():(e.playSpeed<0?(e.currentFrame-=1,e.currentFrame<0&&(e.currentFrame=e.frames.length-1),t=e.currentFrame,t-=1,t<0&&(t=e.frames.length-1),n=-e.frames[t].delay*1/e.playSpeed):(e.currentFrame+=1,e.currentFrame%=e.frames.length,n=e.frames[e.currentFrame].delay*1/e.playSpeed),e.image=e.frames[e.currentFrame].image,r=setTimeout(a,n))}return e={onload:null,onerror:null,onprogress:null,onloadall:null,paused:!1,playing:!1,waitTillDone:!0,loading:!1,firstFrameOnly:!1,width:null,height:null,frames:[],comment:"",length:0,currentFrame:0,frameCount:0,playSpeed:1,lastFrame:null,image:null,playOnLoad:!0,load:C,cancel:_,play:E,pause:k,seek:M,seekFrame:S,togglePlay:A},e}