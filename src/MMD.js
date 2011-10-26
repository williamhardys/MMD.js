(function() {
  var __hasProp = Object.prototype.hasOwnProperty, __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (__hasProp.call(this, i) && this[i] === item) return i; } return -1; };

  this.MMD = (function() {

    function MMD(canvas, width, height) {
      this.width = width;
      this.height = height;
      this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!this.gl) {
        alert('WebGL not supported in your browser');
        throw 'WebGL not supported';
      }
    }

    MMD.prototype.initShaders = function() {
      var attributes, fshader, line, name, src, type, uniforms, vshader, _i, _j, _k, _l, _len, _len2, _len3, _len4, _ref, _ref2, _ref3;
      vshader = this.gl.createShader(this.gl.VERTEX_SHADER);
      this.gl.shaderSource(vshader, MMD.VertexShaderSource);
      this.gl.compileShader(vshader);
      if (!this.gl.getShaderParameter(vshader, this.gl.COMPILE_STATUS)) {
        alert('Vertex shader compilation error');
        throw this.gl.getShaderInfoLog(vshader);
      }
      fshader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
      this.gl.shaderSource(fshader, MMD.FragmentShaderSource);
      this.gl.compileShader(fshader);
      if (!this.gl.getShaderParameter(fshader, this.gl.COMPILE_STATUS)) {
        alert('Fragment shader compilation error');
        throw this.gl.getShaderInfoLog(fshader);
      }
      this.program = this.gl.createProgram();
      this.gl.attachShader(this.program, vshader);
      this.gl.attachShader(this.program, fshader);
      this.gl.linkProgram(this.program);
      if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
        alert('Shader linking error');
        throw this.gl.getProgramInfoLog(this.program);
      }
      this.gl.useProgram(this.program);
      attributes = [];
      uniforms = [];
      _ref = [MMD.VertexShaderSource, MMD.FragmentShaderSource];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        src = _ref[_i];
        _ref2 = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').split(';');
        for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
          line = _ref2[_j];
          type = (_ref3 = line.match(/^\s*(uniform|attribute)\s+/)) != null ? _ref3[1] : void 0;
          if (!type) continue;
          name = line.match(/(\w+)(\[\d+\])?\s*$/)[1];
          if (type === 'attribute' && __indexOf.call(attributes, name) < 0) {
            attributes.push(name);
          }
          if (type === 'uniform' && __indexOf.call(uniforms, name) < 0) {
            uniforms.push(name);
          }
        }
      }
      for (_k = 0, _len3 = attributes.length; _k < _len3; _k++) {
        name = attributes[_k];
        this.program[name] = this.gl.getAttribLocation(this.program, name);
        this.gl.enableVertexAttribArray(this.program[name]);
      }
      for (_l = 0, _len4 = uniforms.length; _l < _len4; _l++) {
        name = uniforms[_l];
        this.program[name] = this.gl.getUniformLocation(this.program, name);
      }
    };

    MMD.prototype.addModel = function(model) {
      this.model = model;
    };

    MMD.prototype.initBuffers = function() {
      this.vbuffers = {};
      this.initVertices();
      this.initBones();
      this.initIndices();
      this.initTextures();
    };

    MMD.prototype.initVertices = function() {
      var buffer, data, edge, i, length, model, normals, positions, uvs, vertex, _i, _len, _ref;
      model = this.model;
      length = model.vertices.length;
      positions = new Float32Array(3 * length);
      normals = new Float32Array(3 * length);
      uvs = new Float32Array(2 * length);
      edge = new Float32Array(length);
      for (i = 0; 0 <= length ? i < length : i > length; 0 <= length ? i++ : i--) {
        vertex = model.vertices[i];
        positions[3 * i] = vertex.x;
        positions[3 * i + 1] = vertex.y;
        positions[3 * i + 2] = vertex.z;
        normals[3 * i] = vertex.nx;
        normals[3 * i + 1] = vertex.ny;
        normals[3 * i + 2] = vertex.nz;
        uvs[2 * i] = vertex.u;
        uvs[2 * i + 1] = vertex.v;
        edge[i] = 1 - vertex.edge_flag;
      }
      model.positions = positions;
      _ref = [
        {
          attribute: 'aVertexPosition',
          array: positions,
          size: 3
        }, {
          attribute: 'aVertexNormal',
          array: normals,
          size: 3
        }, {
          attribute: 'aTextureCoord',
          array: uvs,
          size: 2
        }, {
          attribute: 'aVertexEdge',
          array: edge,
          size: 1
        }
      ];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        data = _ref[_i];
        buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data.array, this.gl.STATIC_DRAW);
        this.vbuffers[data.attribute] = {
          size: data.size,
          buffer: buffer
        };
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    };

    MMD.prototype.initBones = function() {
      var bone1, bone2, bones, buffer, data, i, idx, j, length, material, model, offset, triangles, vert, vertIndex, verts, vertsVisited, weights, _i, _j, _len, _len2, _ref, _ref2, _ref3;
      model = this.model;
      verts = model.vertices;
      length = verts.length;
      vertsVisited = new Uint8Array(length);
      bone1 = new Float32Array(length);
      bone2 = new Float32Array(length);
      weights = new Float32Array(length);
      triangles = model.triangles;
      offset = 0;
      _ref = model.materials;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        material = _ref[_i];
        bones = material.bones = [];
        material.startIndex = offset;
        for (i = 0, _ref2 = material.face_vert_count; i < _ref2; i += 3) {
          for (j = 0; j < 3; j++) {
            vertIndex = triangles[offset + i + j];
            if (vertsVisited[vertIndex] === 1) continue;
            vertsVisited[vertIndex] = 1;
            vert = verts[vertIndex];
            weights[vertIndex] = vert.bone_weight / 100;
            idx = bones.indexOf(vert.bone_num1);
            if (idx < 0) idx = bones.push(vert.bone_num1) - 1;
            bone1[vertIndex] = idx;
            idx = bones.indexOf(vert.bone_num2);
            if (idx < 0) idx = bones.push(vert.bone_num2) - 1;
            bone2[vertIndex] = idx;
          }
        }
        material.endIndex = (offset += material.face_vert_count);
      }
      _ref3 = [
        {
          attribute: 'aBone1',
          array: bone1,
          size: 1
        }, {
          attribute: 'aBone2',
          array: bone2,
          size: 1
        }, {
          attribute: 'aBoneWeight',
          array: weights,
          size: 1
        }
      ];
      for (_j = 0, _len2 = _ref3.length; _j < _len2; _j++) {
        data = _ref3[_j];
        buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data.array, this.gl.STATIC_DRAW);
        this.vbuffers[data.attribute] = {
          size: data.size,
          buffer: buffer
        };
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    };

    MMD.prototype.initIndices = function() {
      var indices;
      indices = this.model.triangles;
      this.ibuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    };

    MMD.prototype.initTextures = function() {
      var fileName, material, model, toonIndex, type, _i, _j, _len, _len2, _ref, _ref2;
      var _this = this;
      model = this.model;
      this.textureManager = new MMD.TextureManager(this);
      this.textureManager.onload = function() {
        return _this.redraw = true;
      };
      _ref = model.materials;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        material = _ref[_i];
        if (!material.textures) material.textures = {};
        toonIndex = material.toon_index;
        fileName = 'toon' + ('0' + (toonIndex + 1)).slice(-2) + '.bmp';
        if (toonIndex === -1 || !model.toon_file_names || fileName === model.toon_file_names[toonIndex]) {
          fileName = 'data/' + fileName;
        } else {
          fileName = model.directory + '/' + model.toon_file_names[toonIndex];
        }
        material.textures.toon = this.textureManager.get('toon', fileName);
        if (material.texture_file_name) {
          _ref2 = material.texture_file_name.split('*');
          for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
            fileName = _ref2[_j];
            switch (fileName.slice(-4)) {
              case '.sph':
                type = 'sph';
                break;
              case '.spa':
                type = 'spa';
                break;
              default:
                type = 'regular';
            }
            material.textures[type] = this.textureManager.get(type, model.directory + '/' + fileName);
          }
        }
      }
    };

    MMD.prototype.start = function() {
      var step, t0;
      var _this = this;
      this.gl.clearColor(1, 1, 1, 1);
      this.gl.clearDepth(1);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.redraw = true;
      if (this.drawSelfShadow) this.shadowMap = new MMD.ShadowMap(this);
      this.motionManager = new MMD.MotionManager;
      t0 = Date.now();
      step = function() {
        var t1;
        _this.move();
        _this.computeMatrices();
        _this.render();
        t1 = Date.now();
        setTimeout(step, Math.max(0, 1000 / _this.fps * 2 - (t1 - t0)));
        return t0 = t1;
      };
      step();
    };

    MMD.prototype.move = function() {
      if (!this.playing) return;
      if (++this.frame > this.motionManager.lastFrame) {
        this.pause();
        return;
      }
      this.moveCameraLight();
      return this.moveModel();
    };

    MMD.prototype.moveCameraLight = function() {
      var camera, light, _ref;
      _ref = this.motionManager.getCameraLightFrame(this.frame), camera = _ref.camera, light = _ref.light;
      if (camera) {
        this.distance = camera.distance;
        this.rotx = camera.rotation[0];
        this.roty = camera.rotation[1];
        this.center = vec3.create(camera.location);
        this.fovy = camera.view_angle;
      }
      if (light) {
        this.lightDirection = light.location;
        this.lightColor = light.color;
      }
    };

    MMD.prototype.moveModel = function() {
      var bones, model, morphs, _ref;
      model = this.model;
      _ref = this.motionManager.getModelFrame(model, this.frame), morphs = _ref.morphs, bones = _ref.bones;
      this.moveMorphs(model, morphs);
      this.moveBones(model, bones);
    };

    MMD.prototype.moveMorphs = function(model, morphs) {
      var b, base, i, j, morph, vert, weight, _i, _j, _len, _len2, _len3, _ref, _ref2, _ref3;
      if (!morphs) return;
      if (model.morphs.length === 0) return;
      _ref = model.morphs;
      for (j = 0, _len = _ref.length; j < _len; j++) {
        morph = _ref[j];
        if (j === 0) {
          base = morph;
          continue;
        }
        if (!(morph.name in morphs)) continue;
        weight = morphs[morph.name];
        _ref2 = morph.vert_data;
        for (_i = 0, _len2 = _ref2.length; _i < _len2; _i++) {
          vert = _ref2[_i];
          b = base.vert_data[vert.index];
          i = b.index;
          model.positions[3 * i] += vert.x * weight;
          model.positions[3 * i + 1] += vert.y * weight;
          model.positions[3 * i + 2] += vert.z * weight;
        }
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbuffers.aVertexPosition.buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, model.positions, this.gl.STATIC_DRAW);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
      _ref3 = base.vert_data;
      for (_j = 0, _len3 = _ref3.length; _j < _len3; _j++) {
        b = _ref3[_j];
        i = b.index;
        model.positions[3 * i] = b.x;
        model.positions[3 * i + 1] = b.y;
        model.positions[3 * i + 2] = b.z;
      }
    };

    MMD.prototype.moveBones = function(model, bones) {
      var bone, boneMotions, motion, p, parent, parentMotion, r, t, _i, _len, _ref;
      if (!bones) return;
      boneMotions = {};
      _ref = model.bones;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        bone = _ref[_i];
        motion = bones[bone.name];
        if (motion) {
          r = motion.rotation;
          t = motion.location;
        } else {
          r = quat4.create([0, 0, 0, 1]);
          t = vec3.create([0, 0, 0]);
        }
        parent = bone.parent_bone_index;
        if (parent === 0xFFFF) {
          boneMotions[bone.name] = {
            p: vec3.add(bone.head_pos, t, vec3.create()),
            r: r
          };
        } else {
          parent = model.bones[parent];
          parentMotion = boneMotions[parent.name];
          /*
                     the position of bone is found as follows
                     take the ORIGINAL bone_head vector relative to it's parent's ORIGINAL bone_head,
                     add translation to it and rotate by the parent's rotation,
                     then add the parent's position
                     i.e. calculate
                       p_1' = r_2' (p_1 - p_2 + t_1) r_2'^* + p_2'
                     where p_1 and p_2 are it's and the parent's ORIGINAL positions respectively,
                     t_1 is it's own translation, and r_2' is the parent's rotation
                     the children of this bone will be affected by the moved position and
                     combined rotational vector
                       r_1' = r_2' + r_1
          */
          r = quat4.createMultiply(parentMotion.r, r);
          p = vec3.createSubtract(bone.head_pos, parent.head_pos);
          vec3.add(p, t);
          vec3.rotateByQuat4(p, parentMotion.r);
          vec3.add(p, parentMotion.p);
          boneMotions[bone.name] = {
            p: p,
            r: r
          };
        }
      }
      model.boneMotions = boneMotions;
    };

    MMD.prototype.computeMatrices = function() {
      var up;
      this.modelMatrix = mat4.createIdentity();
      this.cameraPosition = vec3.create([0, 0, this.distance]);
      vec3.rotateX(this.cameraPosition, this.rotx);
      vec3.rotateY(this.cameraPosition, this.roty);
      vec3.moveBy(this.cameraPosition, this.center);
      up = [0, 1, 0];
      vec3.rotateX(up, this.rotx);
      vec3.rotateY(up, this.roty);
      this.viewMatrix = mat4.lookAt(this.cameraPosition, this.center, up);
      this.mvMatrix = mat4.createMultiply(this.viewMatrix, this.modelMatrix);
      this.pMatrix = mat4.perspective(this.fovy, this.width / this.height, 0.1, 1000.0);
      this.nMatrix = mat4.inverseTranspose(this.mvMatrix, mat4.create());
    };

    MMD.prototype.reindexBones = function(model, bones) {
      var bone, boneIndex, bonePosMoved, bonePosOriginal, boneRotations, motion, _i, _len;
      bonePosOriginal = [];
      bonePosMoved = [];
      boneRotations = [];
      for (_i = 0, _len = bones.length; _i < _len; _i++) {
        boneIndex = bones[_i];
        bone = model.bones[boneIndex];
        bonePosOriginal.push(bone.head_pos[0], bone.head_pos[1], bone.head_pos[2]);
        motion = model.boneMotions[bone.name];
        boneRotations.push(motion.r[0], motion.r[1], motion.r[2], motion.r[3]);
        bonePosMoved.push(motion.p[0], motion.p[1], motion.p[2]);
      }
      this.gl.uniform3fv(this.program.uBonePosOriginal, bonePosOriginal);
      this.gl.uniform3fv(this.program.uBonePosMoved, bonePosMoved);
      this.gl.uniform4fv(this.program.uBoneRotations, boneRotations);
    };

    MMD.prototype.render = function() {
      var attribute, material, vb, _i, _len, _ref, _ref2;
      if (!this.redraw && !this.playing) return;
      this.redraw = false;
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.viewport(0, 0, this.width, this.height);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
      _ref = this.vbuffers;
      for (attribute in _ref) {
        vb = _ref[attribute];
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vb.buffer);
        this.gl.vertexAttribPointer(this.program[attribute], vb.size, this.gl.FLOAT, false, 0, 0);
      }
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);
      this.setSelfShadowTexture();
      this.setUniforms();
      this.gl.enable(this.gl.CULL_FACE);
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.SRC_ALPHA, this.gl.DST_ALPHA);
      _ref2 = this.model.materials;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        material = _ref2[_i];
        if (this.model.boneMotions) {
          this.reindexBones(this.model, material.bones);
          this.gl.uniform1i(this.program.uBoneMotion, true);
        }
        this.renderMaterial(material);
        this.renderEdge(material);
        this.gl.uniform1i(this.program.uBoneMotion, false);
      }
      this.gl.disable(this.gl.CULL_FACE);
      this.gl.disable(this.gl.BLEND);
      this.renderAxes();
      this.gl.flush();
    };

    MMD.prototype.setSelfShadowTexture = function() {
      var material, model, offset, sectionLength, _i, _len, _ref;
      if (!this.drawSelfShadow) return;
      model = this.model;
      this.shadowMap.computeMatrices();
      this.shadowMap.beforeRender();
      if (this.model.boneMotions) {
        this.gl.uniform1i(this.program.uBoneMotion, true);
        _ref = model.materials;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          material = _ref[_i];
          this.reindexBones(model, material.bones);
          sectionLength = material.endIndex - material.startIndex;
          offset = material.startIndex * 2;
          this.gl.drawElements(this.gl.TRIANGLES, sectionLength, this.gl.UNSIGNED_SHORT, offset);
        }
        this.gl.uniform1i(this.program.uBoneMotion, false);
      } else {
        this.gl.drawElements(this.gl.TRIANGLES, model.triangles.length, this.gl.UNSIGNED_SHORT, 0);
      }
      this.shadowMap.afterRender();
      this.gl.activeTexture(this.gl.TEXTURE3);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.shadowMap.getTexture());
      this.gl.uniform1i(this.program.uShadowMap, 3);
      this.gl.uniformMatrix4fv(this.program.uLightMatrix, false, this.shadowMap.getLightMatrix());
      this.gl.uniform1i(this.program.uSelfShadow, true);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.viewport(0, 0, this.width, this.height);
    };

    MMD.prototype.setUniforms = function() {
      var lightDirection;
      this.gl.uniform1f(this.program.uEdgeThickness, this.edgeThickness);
      this.gl.uniform3fv(this.program.uEdgeColor, this.edgeColor);
      this.gl.uniformMatrix4fv(this.program.uMVMatrix, false, this.mvMatrix);
      this.gl.uniformMatrix4fv(this.program.uPMatrix, false, this.pMatrix);
      this.gl.uniformMatrix4fv(this.program.uNMatrix, false, this.nMatrix);
      lightDirection = vec3.createNormalize(this.lightDirection);
      mat4.multiplyVec3(this.nMatrix, lightDirection);
      this.gl.uniform3fv(this.program.uLightDirection, lightDirection);
      this.gl.uniform3fv(this.program.uLightColor, this.lightColor);
    };

    MMD.prototype.renderMaterial = function(material) {
      var offset, sectionLength, textures;
      this.gl.uniform3fv(this.program.uAmbientColor, material.ambient);
      this.gl.uniform3fv(this.program.uSpecularColor, material.specular);
      this.gl.uniform3fv(this.program.uDiffuseColor, material.diffuse);
      this.gl.uniform1f(this.program.uAlpha, material.alpha);
      this.gl.uniform1f(this.program.uShininess, material.shininess);
      this.gl.uniform1i(this.program.uEdge, false);
      textures = material.textures;
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, textures.toon);
      this.gl.uniform1i(this.program.uToon, 0);
      if (textures.regular) {
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, textures.regular);
        this.gl.uniform1i(this.program.uTexture, 1);
      }
      this.gl.uniform1i(this.program.uUseTexture, !!textures.regular);
      if (textures.sph || textures.spa) {
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, textures.sph || textures.spa);
        this.gl.uniform1i(this.program.uSphereMap, 2);
        this.gl.uniform1i(this.program.uUseSphereMap, true);
        this.gl.uniform1i(this.program.uIsSphereMapAdditive, !!textures.spa);
      } else {
        this.gl.uniform1i(this.program.uUseSphereMap, false);
      }
      this.gl.cullFace(this.gl.BACK);
      sectionLength = material.endIndex - material.startIndex;
      offset = material.startIndex * 2;
      this.gl.drawElements(this.gl.TRIANGLES, sectionLength, this.gl.UNSIGNED_SHORT, offset);
    };

    MMD.prototype.renderEdge = function(material) {
      var offset, sectionLength;
      if (!this.drawEdge || !material.edge_flag) return;
      this.gl.uniform1i(this.program.uEdge, true);
      this.gl.cullFace(this.gl.FRONT);
      sectionLength = material.endIndex - material.startIndex;
      offset = material.startIndex * 2;
      this.gl.drawElements(this.gl.TRIANGLES, sectionLength, this.gl.UNSIGNED_SHORT, offset);
      this.gl.cullFace(this.gl.BACK);
      return this.gl.uniform1i(this.program.uEdge, false);
    };

    MMD.prototype.renderAxes = function() {
      var axis, axisBuffer, color, i;
      axisBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, axisBuffer);
      this.gl.vertexAttribPointer(this.program.aVertexPosition, 3, this.gl.FLOAT, false, 0, 0);
      if (this.drawAxes) {
        this.gl.uniform1i(this.program.uAxis, true);
        for (i = 0; i < 3; i++) {
          axis = [0, 0, 0, 0, 0, 0];
          axis[i] = 65;
          color = [0, 0, 0];
          color[i] = 1;
          this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axis), this.gl.STATIC_DRAW);
          this.gl.uniform3fv(this.program.uAxisColor, color);
          this.gl.drawArrays(this.gl.LINES, 0, 2);
        }
        axis = [-50, 0, 0, 0, 0, 0, 0, 0, -50, 0, 0, 0];
        for (i = -50; i <= 50; i += 5) {
          if (i !== 0) axis.push(i, 0, -50, i, 0, 50, -50, 0, i, 50, 0, i);
        }
        color = [0.7, 0.7, 0.7];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axis), this.gl.STATIC_DRAW);
        this.gl.uniform3fv(this.program.uAxisColor, color);
        this.gl.drawArrays(this.gl.LINES, 0, 84);
        this.gl.uniform1i(this.program.uAxis, false);
      }
      if (this.drawCenterPoint) {
        this.gl.uniform1i(this.program.uCenterPoint, true);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.center), this.gl.STATIC_DRAW);
        this.gl.drawArrays(this.gl.POINTS, 0, 1);
        this.gl.uniform1i(this.program.uCenterPoint, false);
      }
      this.gl.deleteBuffer(axisBuffer);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    };

    MMD.prototype.registerKeyListener = function(element) {
      var _this = this;
      element.addEventListener('keydown', function(e) {
        if (_this.playing) return;
        switch (e.keyCode + e.shiftKey * 1000 + e.ctrlKey * 10000 + e.altKey * 100000) {
          case 37:
            _this.roty += Math.PI / 12;
            break;
          case 39:
            _this.roty -= Math.PI / 12;
            break;
          case 38:
            _this.rotx += Math.PI / 12;
            break;
          case 40:
            _this.rotx -= Math.PI / 12;
            break;
          case 33:
            _this.distance -= 3 * _this.distance / _this.DIST;
            break;
          case 34:
            _this.distance += 3 * _this.distance / _this.DIST;
            break;
          case 36:
            _this.rotx = _this.roty = 0;
            _this.center = [0, 10, 0];
            _this.distance = _this.DIST;
            break;
          case 1037:
            vec3.multiplyMat4(_this.center, _this.mvMatrix);
            _this.center[0] -= _this.distance / _this.DIST;
            vec3.multiplyMat4(_this.center, mat4.createInverse(_this.mvMatrix));
            break;
          case 1039:
            vec3.multiplyMat4(_this.center, _this.mvMatrix);
            _this.center[0] += _this.distance / _this.DIST;
            vec3.multiplyMat4(_this.center, mat4.createInverse(_this.mvMatrix));
            break;
          case 1038:
            vec3.multiplyMat4(_this.center, _this.mvMatrix);
            _this.center[1] += _this.distance / _this.DIST;
            vec3.multiplyMat4(_this.center, mat4.createInverse(_this.mvMatrix));
            break;
          case 1040:
            vec3.multiplyMat4(_this.center, _this.mvMatrix);
            _this.center[1] -= _this.distance / _this.DIST;
            vec3.multiplyMat4(_this.center, mat4.createInverse(_this.mvMatrix));
            break;
          default:
            return;
        }
        e.preventDefault();
        return _this.redraw = true;
      }, false);
    };

    MMD.prototype.registerMouseListener = function(element) {
      this.registerDragListener(element);
      this.registerWheelListener(element);
    };

    MMD.prototype.registerDragListener = function(element) {
      var _this = this;
      element.addEventListener('mousedown', function(e) {
        var modifier, move, onmousemove, onmouseup, ox, oy;
        if (_this.playing) return;
        if (e.button !== 0) return;
        modifier = e.shiftKey * 1000 + e.ctrlKey * 10000 + e.altKey * 100000;
        if (modifier !== 0 && modifier !== 1000) return;
        ox = e.clientX;
        oy = e.clientY;
        move = function(dx, dy, modi) {
          if (modi === 0) {
            _this.roty -= dx / 100;
            _this.rotx -= dy / 100;
            return _this.redraw = true;
          } else if (modi === 1000) {
            vec3.multiplyMat4(_this.center, _this.mvMatrix);
            _this.center[0] -= dx / 30 * _this.distance / _this.DIST;
            _this.center[1] += dy / 30 * _this.distance / _this.DIST;
            vec3.multiplyMat4(_this.center, mat4.createInverse(_this.mvMatrix));
            return _this.redraw = true;
          }
        };
        onmouseup = function(e) {
          var modi;
          if (e.button !== 0) return;
          modi = e.shiftKey * 1000 + e.ctrlKey * 10000 + e.altKey * 100000;
          move(e.clientX - ox, e.clientY - oy, modi);
          element.removeEventListener('mouseup', onmouseup, false);
          element.removeEventListener('mousemove', onmousemove, false);
          return e.preventDefault();
        };
        onmousemove = function(e) {
          var modi, x, y;
          if (e.button !== 0) return;
          modi = e.shiftKey * 1000 + e.ctrlKey * 10000 + e.altKey * 100000;
          x = e.clientX;
          y = e.clientY;
          move(x - ox, y - oy, modi);
          ox = x;
          oy = y;
          return e.preventDefault();
        };
        element.addEventListener('mouseup', onmouseup, false);
        return element.addEventListener('mousemove', onmousemove, false);
      }, false);
    };

    MMD.prototype.registerWheelListener = function(element) {
      var onwheel;
      var _this = this;
      onwheel = function(e) {
        var delta;
        if (_this.playing) return;
        delta = e.detail || e.wheelDelta / (-40);
        _this.distance += delta * _this.distance / _this.DIST;
        _this.redraw = true;
        return e.preventDefault();
      };
      if ('onmousewheel' in window) {
        element.addEventListener('mousewheel', onwheel, false);
      } else {
        element.addEventListener('DOMMouseScroll', onwheel, false);
      }
    };

    MMD.prototype.initParameters = function() {
      this.rotx = this.roty = 0;
      this.distance = this.DIST = 35;
      this.center = [0, 10, 0];
      this.fovy = 40;
      this.drawEdge = true;
      this.edgeThickness = 0.004;
      this.edgeColor = [0, 0, 0];
      this.lightDirection = [0.5, 1.0, 0.5];
      this.lightDistance = 8875;
      this.lightColor = [0.6, 0.6, 0.6];
      this.drawSelfShadow = true;
      this.drawAxes = true;
      this.drawCenterPoint = false;
      this.fps = 30;
      this.playing = false;
      this.frame = -1;
    };

    MMD.prototype.addCameraLightMotion = function(motion, merge_flag, frame_offset) {
      this.motionManager.addCameraLightMotion(motion, merge_flag, frame_offset);
    };

    MMD.prototype.addModelMotion = function(model, motion, merge_flag, frame_offset) {
      this.motionManager.addModelMotion(model, motion, merge_flag, frame_offset);
    };

    MMD.prototype.play = function() {
      this.playing = true;
    };

    MMD.prototype.pause = function() {
      this.playing = false;
    };

    MMD.prototype.rewind = function() {
      this.setFrameNumber(-1);
    };

    MMD.prototype.setFrameNumber = function(num) {
      this.frame = num;
    };

    return MMD;

  })();

}).call(this);