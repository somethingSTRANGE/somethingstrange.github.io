var bufObj={},ShProg={},prog,canvas,textureObj,maskTextureObj,gl,VertexBuffer,Texture;function render(k){var j,e,a,i,f,c,d,g,h,b;setTimeout(()=>{var a=document.getElementById("js-script-frames"),b=a.value;b++,a.value=b},1e3),j=[canvas.width,canvas.height],e=document.getElementById("brightness").value,a=document.getElementById("curvature").value,i=document.getElementById("scanLineOpacity").value,f=document.getElementById("vignetteOpacity").value,c=document.getElementById("vignetteRoundness").value,d=document.getElementById("distortion").value/100,g=document.getElementById("rgbshift").value/1e3,h=document.getElementById("stripes").value/100,gl.viewport(0,0,canvas.width,canvas.height),gl.enable(gl.DEPTH_TEST),gl.clearColor(0,0,0,1),gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT),b=0,gl.activeTexture(gl.TEXTURE0+b),gl.bindTexture(gl.TEXTURE_2D,textureObj),ShProg.Use(progDraw),ShProg.SetI1(progDraw,"u_texture",b),ShProg.SetF2(progDraw,"u_curvature",[a,a]),ShProg.SetF1(progDraw,"u_distortion",d),ShProg.SetF1(progDraw,"u_stripe",h),ShProg.SetF1(progDraw,"u_rgbshift",g),ShProg.SetF1(progDraw,"brightness",e),ShProg.SetF2(progDraw,"scanLineOpacity",[0,i]),ShProg.SetF1(progDraw,"vignetteOpacity",f),ShProg.SetF1(progDraw,"vignetteRoundness",c),ShProg.SetF2(progDraw,"screenResolution",[240,160]),VertexBuffer.Draw(bufRect),requestAnimationFrame(render)}function resize(){vp_size=[window.innerWidth,window.innerHeight],canvas.width=vp_size[0],canvas.height=vp_size[1]}function vertexShader(){return`
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
        float intensity = sin(uv * (0.2 * resolution) * PI * 2.0);
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
    `}window.onload=function(){var a=document.getElementById("js-script-version");e.innerHTML='FOUND YOU'};function init(){var a,b,c,d,f;if(setTimeout(()=>{var a=document.getElementById("js-script-version");for(e.innerHTML='FOUND YOU';a.firstChild;)a.removeChild(a.firstChild);a.appendChild(document.createTextNode("1.0.1"))},1e3),canvas=document.getElementById("retro-canvas"),gl=canvas.getContext("experimental-webgl"),!gl)return;a=128,b=128,c=[];for(ix=0;ix<a;++ix)for(iy=0;iy<b;++iy)d=Math.sin(Math.PI*6*ix/a),f=Math.sin(Math.PI*6*iy/b),c.push(128+127*d,63,128+127*f,255);if(textureObj=Texture.LoadTexture2D("https://upload.wikimedia.org/wikipedia/commons/a/a2/Wax_fire.gif"),progDraw=ShProg.Create([{source:vertexShader(),stage:gl.VERTEX_SHADER},{source:fragmentShader(),stage:gl.FRAGMENT_SHADER}]),progDraw.inPos=gl.getAttribLocation(progDraw.progObj,"inPos"),progDraw.progObj==0)return;bufRect=VertexBuffer.Create([{data:[-1,-1,1,-1,1,1,-1,1],attrSize:2,attrLoc:progDraw.inPos}],[0,1,2,0,2,3]),window.onresize=resize,resize(),requestAnimationFrame(render)}ShProg={Create:function(e){for(var g=[],d=0,f,a,h,b,c,i;d<e.length;++d)f=this.Compile(e[d].source,e[d].stage),f&&g.push(f);if(a={},a.progObj=this.Link(g),a.progObj){a.attrInx={},h=gl.getProgramParameter(a.progObj,gl.ACTIVE_ATTRIBUTES);for(b=0;b<h;++b)c=gl.getActiveAttrib(a.progObj,b).name,a.attrInx[c]=gl.getAttribLocation(a.progObj,c);a.uniLoc={},i=gl.getProgramParameter(a.progObj,gl.ACTIVE_UNIFORMS);for(b=0;b<i;++b)c=gl.getActiveUniform(a.progObj,b).name,a.uniLoc[c]=gl.getUniformLocation(a.progObj,c)}return a},AttrI:function(a,b){return a.attrInx[b]},UniformL:function(a,b){return a.uniLoc[b]},Use:function(a){gl.useProgram(a.progObj)},SetI1:function(a,b,c){a.uniLoc[b]&&gl.uniform1i(a.uniLoc[b],c)},SetF1:function(a,b,c){a.uniLoc[b]&&gl.uniform1f(a.uniLoc[b],c)},SetF2:function(a,b,c){a.uniLoc[b]&&gl.uniform2fv(a.uniLoc[b],c)},SetF3:function(a,b,c){a.uniLoc[b]&&gl.uniform3fv(a.uniLoc[b],c)},SetF4:function(a,b,c){a.uniLoc[b]&&gl.uniform4fv(a.uniLoc[b],c)},SetM33:function(a,b,c){a.uniLoc[b]&&gl.uniformMatrix3fv(a.uniLoc[b],!1,c)},SetM44:function(a,b,c){a.uniLoc[b]&&gl.uniformMatrix4fv(a.uniLoc[b],!1,c)},Compile:function(b,e){var c=document.getElementById(b),a,d;return c&&(b=c.text),a=gl.createShader(e),gl.shaderSource(a,b),gl.compileShader(a),d=gl.getShaderParameter(a,gl.COMPILE_STATUS),d||alert(gl.getShaderInfoLog(a)),d?a:null},Link:function(c){for(var a=gl.createProgram(),b=0;b<c.length;++b)gl.attachShader(a,c[b]);return gl.linkProgram(a),status=gl.getProgramParameter(a,gl.LINK_STATUS),status||alert(gl.getProgramInfoLog(a)),status?a:null}},VertexBuffer={Create:function(b,d,e){for(var c={buf:[],attr:[],inx:gl.createBuffer(),inxLen:d.length,primitive_type:e||gl.TRIANGLES},a=0;a<b.length;++a)c.buf.push(gl.createBuffer()),c.attr.push({size:b[a].attrSize,loc:b[a].attrLoc,no_of:b[a].data.length/b[a].attrSize}),gl.bindBuffer(gl.ARRAY_BUFFER,c.buf[a]),gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(b[a].data),gl.STATIC_DRAW);return gl.bindBuffer(gl.ARRAY_BUFFER,null),c.inxLen>0&&(gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,c.inx),gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(d),gl.STATIC_DRAW),gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null)),c},Draw:function(a){for(var b=0;b<a.buf.length;++b)gl.bindBuffer(gl.ARRAY_BUFFER,a.buf[b]),gl.vertexAttribPointer(a.attr[b].loc,a.attr[b].size,gl.FLOAT,!1,0,0),gl.enableVertexAttribArray(a.attr[b].loc);a.inxLen>0?(gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,a.inx),gl.drawElements(a.primitive_type,a.inxLen,gl.UNSIGNED_SHORT,0),gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null)):gl.drawArrays(a.primitive_type,0,a.attr[0].no_of);for(b=0;b<a.buf.length;++b)gl.disableVertexAttribArray(a.attr[b].loc);gl.bindBuffer(gl.ARRAY_BUFFER,null)}},Texture={},Texture.HandleLoadedTexture2D=function(c,a,b){return gl.activeTexture(gl.TEXTURE0),gl.bindTexture(gl.TEXTURE_2D,a),gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,b!=void 0&&b==!0),gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE),gl.bindTexture(gl.TEXTURE_2D,null),a},Texture.LoadTexture2D=function(b){var a=gl.createTexture();return a.image=new Image,a.image.setAttribute('crossorigin','anonymous'),a.image.onload=function(){Texture.HandleLoadedTexture2D(a.image,a,!0)},a.image.src=b,a},setTimeout(()=>{init()},1e3)