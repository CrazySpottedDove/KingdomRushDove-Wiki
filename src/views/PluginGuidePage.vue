<script setup lang="ts">
</script>

<template>
  <div class="page-wrap">
  			<header>
  				<h1>模组（Mod）开发文档</h1>
  				<p>KingdomRushDove · 最后更新：2026</p>
  			</header>
  
  			<!-- TOC -->
  			<nav class="toc">
  				<h2>目录</h2>
  				<ol>
  					<li><a href="#overview">概述</a></li>
  					<li><a href="#structure">目录结构</a></li>
  					<li><a href="#config">配置文件 config.lua</a></li>
  					<li><a href="#entrypoint">模组入口文件</a></li>
  					<li><a href="#hooks">钩子系统（hook_utils）</a></li>
  					<li><a href="#assets">资产覆盖</a></li>
  					<li><a href="#globals">全局工具函数</a></li>
  					<li><a href="#mod_utils">mod_utils 工具函数</a></li>
  					<li><a href="#example">示例：从零开发一个基础模组</a></li>
  				</ol>
  			</nav>
  
  			<!-- 1. 概述 -->
  			<section id="overview">
  				<h2 class="section-title">1. 概述</h2>
  				<p>
  					KingdomRushDove
  					内置了一套轻量级的模组系统，允许开发者在不修改游戏源码的前提下，通过覆盖资产、
  					修改模板数据、拦截函数调用等方式对游戏内容进行扩展或修改。
  				</p>
  				<p>模组系统由以下核心模块组成：</p>
  				<ul>
  					<li>
  						<code>mod_main.lua</code> —
  						模组管理器，负责发现、加载和初始化所有模组
  					</li>
  					<li>
  						<code>mod_db.lua</code> —
  						模组数据库，扫描并维护可用模组列表
  					</li>
  					<li>
  						<code>mod_hook.lua</code> —
  						内置系统级钩子（图像、声音、关卡、波次资产覆盖）
  					</li>
  					<li>
  						<code>hook_utils.lua</code> — 钩子工具库，供模组使用
  					</li>
  					<li><code>mod_utils.lua</code> — 通用工具函数库</li>
  					<li>
  						<code>mod_globals.lua</code> — 注入模组可用的全局变量
  					</li>
  				</ul>
  			</section>
  
  			<!-- 2. 目录结构 -->
  			<section id="structure">
  				<h2 class="section-title">2. 目录结构</h2>
  				<p>
  					所有模组均放置在
  					<code>mods/local/</code>
  					目录下，每个模组占据一个独立的子目录：
  				</p>
  				<div class="tree">
  					<span class="dir">mods/local/</span><br />
  					&nbsp;&nbsp;<span class="dir">└── my_mod/</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 模组根目录（名称即模组 ID）</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="file"
  						>├── config.lua</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 必须，模组元信息</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="file"
  						>├── my_mod.lua</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 必须，模组入口（文件名与目录名相同）</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="dir"
  						>├── scripts/</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 可选，脚本文件（自动加入 require 路径）</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="dir"
  						>├── data/</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 可选，数据文件</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="dir"
  						>│&nbsp;&nbsp;&nbsp;├── levels/</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 覆盖关卡数据</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="dir"
  						>│&nbsp;&nbsp;&nbsp;└── waves/</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 覆盖波次数据</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="dir"
  						>└── _assets/</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 可选，资产覆盖</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="dir"
  						>├── images/</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 覆盖图像图集（atlas）</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="dir"
  						>└── sounds/</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 覆盖声音资源</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="file"
  						>├── settings.lua</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="file"
  						>├── sounds.lua</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="file"
  						>├── groups.lua</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="file"
  						>├── extra.lua</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="dir"
  						>└── files/</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 覆盖声音文件</span
  					>
  				</div>
  				<div class="callout info">
  					<b>模组 ID</b>：模组的目录名即为模组
  					ID，也是入口文件名（不含 <code>.lua</code>）。 模组 ID
  					必须全局唯一，且只能包含字母、数字和下划线。
  				</div>
  				<p>
  					<code>data/</code> 下的子目录会被特殊处理：<code
  						>data/kui_templates</code
  					>
  					会自动以最高优先级注册到 KUI 模板路径，其他子目录则加入
  					<code>require</code> 路径。
  					<code>_assets/</code> 目录不会加入
  					<code>require</code> 路径（由系统忽略）。
  				</p>
  			</section>
  
  			<!-- 3. 配置文件 -->
  			<section id="config">
  				<h2 class="section-title">3. 配置文件 config.lua</h2>
  				<p>
  					每个模组的根目录下必须有一个
  					<code>config.lua</code>，返回一个配置表：
  				</p>
  				<pre><code><span class="kw">return</span> {
      name         = <span class="str">"我的模组"</span>,           <span class="cmt">-- 显示名称（可含中文）</span>
      entry        = <span class="str">"my_mod"</span>,            <span class="cmt">-- 模组唯一标识符，只能含字母/数字/下划线</span>
      version      = <span class="str">"1.0.0"</span>,
      game_version = {<span class="str">"kr5"</span>, <span class="str">"kr3"</span>, <span class="str">"kr2"</span>, <span class="str">"kr1"</span>}, <span class="cmt">-- 支持的游戏版本，必须为字符串数组</span>
      desc         = <span class="str">"模组描述"</span>,
      url          = <span class="str">"https://example.com"</span>, <span class="cmt">-- 发布链接，可为空字符串</span>
      by           = <span class="str">"作者名"</span>,             <span class="cmt">-- 必须与插件商店账户名相同</span>
      category     = <span class="">"other"</span>, <span class="cmt">插件类型，详见下表</span>
      enabled      = <span class="kw">true</span>,               <span class="cmt">-- false 则跳过加载</span>
      priority     = <span class="num">0</span>                   <span class="cmt">-- 数值越大优先级越低，不确定填 0</span>
  }</code></pre>
  
  				<table>
  					<thead>
  						<tr>
  							<th>字段</th>
  							<th>类型</th>
  							<th>说明</th>
  						</tr>
  					</thead>
  					<tbody>
  						<tr>
  							<td><code>name</code></td>
  							<td>string</td>
  							<td>模组显示名称（可含中文）</td>
  						</tr>
  						<tr>
  							<td><code>entry</code></td>
  							<td>string</td>
  							<td>
  								模组唯一标识符，也是模组目录名和入口文件名（不含
  								<code>.lua</code
  								>）。只能包含字母、数字和下划线。
  								上传到插件商店时以此命名 zip 文件，zip
  								内必须能直接找到同名 <code>.lua</code> 文件。
  							</td>
  						</tr>
  						<tr>
  							<td><code>version</code></td>
  							<td>string</td>
  							<td>模组版本号</td>
  						</tr>
  						<tr>
  							<td><code>game_version</code></td>
  							<td>string[]</td>
  							<td>
  								兼容的游戏版本，用于在加载前校验。可选值：<code
  									>"kr1"</code
  								>
  								<code>"kr2"</code> <code>"kr3"</code>
  								<code>"kr5"</code>
  							</td>
  						</tr>
  						<tr>
  							<td><code>desc</code></td>
  							<td>string</td>
  							<td>模组描述</td>
  						</tr>
  						<tr>
  							<td><code>url</code></td>
  							<td>string</td>
  							<td>模组发布页链接</td>
  						</tr>
  						<tr>
  							<td><code>by</code></td>
  							<td>string</td>
  							<td>
  								作者名。上传到插件商店时，此字段必须与登录账户的用户名完全一致。
  							</td>
  						</tr>
  						<tr>
  							<td><code>category</code></td>
  							<td>string</td>
  							<td>
  								插件类型。可选项："gameplay"（玩法）,
  								"cosmetic"（美化）, "display"（显示）,
  								"tower"（防御塔）, "hero"（英雄）,
  								"enemy"（敌人）, "level"（关卡）,
  								"other"（其它）,
  							</td>
  						</tr>
  						<tr>
  							<td><code>enabled</code></td>
  							<td>boolean</td>
  							<td><code>false</code> 时跳过加载</td>
  						</tr>
  						<tr>
  							<td><code>priority</code></td>
  							<td>number</td>
  							<td>
  								优先级，数值越小越先初始化（覆盖力越强），默认
  								<code>0</code>
  							</td>
  						</tr>
  					</tbody>
  				</table>
  
  				<div class="callout info">
  					<b>上传到插件商店的要求：</b>
  					zip 内顶层必须同时包含 <code>config.lua</code> 和
  					<code>$entry.lua</code>（即 entry 字段值加
  					<code>.lua</code>）两个文件。zip
  					文件本身的名称不限，可以使用中文。上传需要先在插件商店注册账户并登录，且
  					<code>by</code> 字段必须与登录用户名相同。
  				</div>
  
  				<h3>优先级说明</h3>
  				<p>
  					模组按
  					<code>priority</code>
  					升序排列。<strong>数值小的模组最后初始化</strong>，因此其钩子会覆盖数值大的模组。
  					多个模组同时存在时，优先级越小（数值越低）的模组"胜出"。
  				</p>
  			</section>
  
  			<!-- 4. 入口文件 -->
  			<section id="entrypoint">
  				<h2 class="section-title">4. 模组入口文件</h2>
  				<p>
  					入口文件名必须与模组目录名相同（如目录为
  					<code>my_mod/</code>，入口文件为 <code>my_mod.lua</code>）。
  					文件必须返回一个 <strong>table</strong>，且该 table 必须包含
  					<code>init</code> 方法。
  				</p>
  
  				<h3>最小结构</h3>
  				<pre><code><span class="kw">local</span> hook_utils = <span class="fn">require</span>(<span class="str">"hook_utils"</span>)
  <span class="kw">local</span> HOOK = hook_utils.HOOK
  
  <span class="kw">local</span> hook = hook_utils:<span class="fn">new</span>()
  
  <span class="cmt">-- 必须实现：模组初始化入口</span>
  <span class="kw">function</span> hook:<span class="fn">init</span>(mod_data)
      self.mod_data = mod_data
      <span class="cmt">-- 在此注册钩子、修改模板数据等</span>
      HOOK(E, <span class="str">"load"</span>, self.E.load)
  <span class="kw">end</span>
  
  <span class="kw">function</span> hook.E.<span class="fn">load</span>(load, self)
      load(self)  <span class="cmt">-- 先调用原函数</span>
      <span class="fn">require</span>(<span class="str">"my_mod_templates"</span>)
  <span class="kw">end</span>
  
  <span class="kw">return</span> hook</code></pre>
  
  				<h3>init 方法参数</h3>
  				<p>
  					<code>mod_data</code> 是由系统传入的模组数据表，常用字段：
  				</p>
  				<table>
  					<thead>
  						<tr>
  							<th>字段</th>
  							<th>类型</th>
  							<th>说明</th>
  						</tr>
  					</thead>
  					<tbody>
  						<tr>
  							<td><code>mod_data.name</code></td>
  							<td>string</td>
  							<td>模组目录名（即模组 ID）</td>
  						</tr>
  						<tr>
  							<td><code>mod_data.path</code></td>
  							<td>string</td>
  							<td>模组根目录的完整路径</td>
  						</tr>
  						<tr>
  							<td><code>mod_data.config</code></td>
  							<td>table</td>
  							<td>config.lua 返回的配置表</td>
  						</tr>
  						<tr>
  							<td><code>mod_data.priority</code></td>
  							<td>number</td>
  							<td>模组优先级</td>
  						</tr>
  						<tr>
  							<td><code>mod_data.check_paths</code></td>
  							<td>table</td>
  							<td>检测到的资产覆盖路径映射表</td>
  						</tr>
  					</tbody>
  				</table>
  			</section>
  
  			<!-- 5. 钩子系统 -->
  			<section id="hooks">
  				<h2 class="section-title">5. 钩子系统（hook_utils）</h2>
  				<p>
  					钩子系统允许模组拦截并扩展任意对象上的函数，而无需直接替换它。
  					多个模组可以对同一函数注册多个钩子，系统会以链式方式依次调用。
  				</p>
  
  				<h3>HOOK — 注册钩子</h3>
  				<pre><code><span class="kw">local</span> hook_utils = <span class="fn">require</span>(<span class="str">"hook_utils"</span>)
  <span class="kw">local</span> HOOK = hook_utils.HOOK
  
  <span class="cmt">-- HOOK(对象, 函数名, 处理器函数 [, 优先级])</span>
  HOOK(SomeObj, <span class="str">"some_method"</span>, <span class="kw">function</span>(original_fn, self, arg1, arg2)
      <span class="cmt">-- 可在调用原函数前执行逻辑</span>
      <span class="kw">local</span> result = original_fn(self, arg1, arg2)  <span class="cmt">-- 调用原函数（或下一个钩子）</span>
      <span class="cmt">-- 可在调用原函数后执行逻辑</span>
      <span class="kw">return</span> result
  <span class="kw">end</span>)</code></pre>
  
  				<p>
  					处理器函数的签名：<code
  						>function(next_fn, self_or_first_arg, ...)</code
  					>
  				</p>
  				<ul>
  					<li>
  						<code>next_fn</code> —
  						调用下一个钩子（或原函数）的函数，<strong>必须调用</strong>以维持调用链
  					</li>
  					<li>其余参数与原函数一致</li>
  					<li>
  						优先级（第四个参数）默认为
  						<code>0</code>，数值越小越先执行
  					</li>
  				</ul>
  
  				<h3>在实例上使用钩子（推荐写法）</h3>
  				<p>
  					推荐使用
  					<code>hook_utils:new()</code>
  					创建实例，将处理器存放在实例的命名空间下，便于管理：
  				</p>
  				<pre><code><span class="kw">local</span> hook = hook_utils:<span class="fn">new</span>()
  
  <span class="kw">function</span> hook:<span class="fn">init</span>(mod_data)
      HOOK(E, <span class="str">"load"</span>, self.E.load)    <span class="cmt">-- 钩子处理器定义在 hook.E.load</span>
      HOOK(S, <span class="str">"play"</span>, self.S.play)
  <span class="kw">end</span>
  
  <span class="cmt">-- 处理器：self.E.load（使用嵌套命名空间隔离）</span>
  <span class="kw">function</span> hook.E.<span class="fn">load</span>(load, self)
      load(self)
      <span class="cmt">-- 自定义逻辑</span>
  <span class="kw">end</span></code></pre>
  
  				<div class="callout warn">
  					<b>注意命名空间</b>：<code>hook_utils:new()</code>
  					使用了自动创建子表的元表，访问不存在的键会自动创建空表，
  					因此可以直接写
  					<code>hook.E.load = function(...) end</code> 而不会报错。
  				</div>
  
  				<h3>UNHOOK — 移除钩子</h3>
  				<pre><code>hook_utils.<span class="fn">UNHOOK</span>(SomeObj, <span class="str">"some_method"</span>, handler_function)</code></pre>
  				<p>传入与注册时相同的函数引用即可移除对应钩子。</p>
  
  				<h3>CALL_ORIGINAL — 直接调用原函数</h3>
  				<pre><code>hook_utils.<span class="fn">CALL_ORIGINAL</span>(SomeObj, <span class="str">"some_method"</span>, arg1, arg2)</code></pre>
  				<p>绕过所有钩子，直接调用被钩住前的原始函数。</p>
  
  				<h3>钩子执行顺序</h3>
  				<p>
  					注册时
  					<code>priority</code> 越小，越先被执行（越外层包装）。
  					最后注册且优先级最高的钩子最先被调用，最终才调用原始函数。
  					模组 <code>priority</code> 越小（数值低），其
  					<code>init</code> 越晚执行，注册的钩子也越靠外。
  				</p>
  			</section>
  
  			<!-- 6. 资产覆盖 -->
  			<section id="assets">
  				<h2 class="section-title">6. 资产覆盖</h2>
  				<p>
  					系统在加载图像、声音、关卡数据、波次数据时会自动检测模组目录下对应路径是否存在覆盖文件，
  					若存在则以模组版本替换原始资源。无需手动注册，只需按规定目录放置文件即可。
  				</p>
  
  				<h3>图像图集覆盖</h3>
  				<p>路径：<code>_assets/images/&lt;atlas_name&gt;.lua</code></p>
  				<p>
  					当游戏加载名为
  					<code>atlas_name</code> 的图集时，若模组在对应路径存在同名
  					<code>.lua</code>
  					文件，则图集会被模组版本覆盖。图集文件格式与原始游戏一致。
  				</p>
  
  				<h3>声音资源覆盖</h3>
  				<table>
  					<thead>
  						<tr>
  							<th>路径</th>
  							<th>作用</th>
  						</tr>
  					</thead>
  					<tbody>
  						<tr>
  							<td><code>_assets/sounds/settings.lua</code></td>
  							<td>
  								覆盖声音源分组设置（<code>source_groups</code>）
  							</td>
  						</tr>
  						<tr>
  							<td><code>_assets/sounds/sounds.lua</code></td>
  							<td>完全替换声音定义表</td>
  						</tr>
  						<tr>
  							<td><code>_assets/sounds/groups.lua</code></td>
  							<td>完全替换声音分组表</td>
  						</tr>
  						<tr>
  							<td><code>_assets/sounds/extra.lua</code></td>
  							<td>增量追加声音与分组（推荐，不破坏其他模组）</td>
  						</tr>
  						<tr>
  							<td><code>_assets/sounds/files/</code></td>
  							<td>覆盖声音文件（实际音频）</td>
  						</tr>
  					</tbody>
  				</table>
  
  				<h4>extra.lua 格式（推荐）</h4>
  				<pre><code><span class="kw">return</span> {
      sounds = {
          my_sound = { files = {<span class="str">"my_sound.ogg"</span>} }
      },
      groups = {
          <span class="cmt">-- append = true 表示追加到现有分组</span>
          existing_group = { append = <span class="kw">true</span>, files = {<span class="str">"extra.ogg"</span>} },
          <span class="cmt">-- alias 表示复用另一分组</span>
          another_group  = { alias = <span class="str">"existing_group"</span> },
          <span class="cmt">-- 直接赋值则替换整个分组</span>
          new_group = { files = {<span class="str">"new.ogg"</span>} }
      }
  }</code></pre>
  
  				<h3>关卡数据覆盖</h3>
  				<p>路径：<code>data/levels/&lt;level_name&gt;.lua</code></p>
  				<p>
  					覆盖关卡的 <code>data</code> 和
  					<code>locations</code> 字段，其余字段保持原样。
  				</p>
  
  				<h3>波次数据覆盖</h3>
  				<p>路径：<code>data/waves/&lt;level_name&gt;.lua</code></p>
  				<p>完全替换指定关卡的波次路径数据。</p>
  			</section>
  
  			<!-- 7. 全局工具函数 -->
  			<section id="globals">
  				<h2 class="section-title">7. 全局工具函数</h2>
  				<p>
  					以下函数和变量由
  					<code>mod_globals.lua</code> 注入，在模组代码中可直接使用：
  				</p>
  
  				<h3>全局变量</h3>
  				<table>
  					<thead>
  						<tr>
  							<th>变量</th>
  							<th>说明</th>
  						</tr>
  					</thead>
  					<tbody>
  						<tr>
  							<td><code>IS_KR5</code></td>
  							<td>当前是否运行 kr5 版本</td>
  						</tr>
  						<tr>
  							<td><code>IS_LOVE_11</code></td>
  							<td>是否使用 LÖVE 11+</td>
  						</tr>
  						<tr>
  							<td><code>E</code></td>
  							<td>entity_db 实例，管理实体模板</td>
  						</tr>
  						<tr>
  							<td><code>UPGR</code></td>
  							<td>upgrades 模块</td>
  						</tr>
  						<tr>
  							<td><code>SH</code></td>
  							<td>shader_db 实例</td>
  						</tr>
  						<tr>
  							<td><code>V</code></td>
  							<td>
  								vector 工具库（<code>V.v</code>,
  								<code>V.vv</code>）
  							</td>
  						</tr>
  						<tr>
  							<td><code>signal</code></td>
  							<td>信号/事件系统</td>
  						</tr>
  						<tr>
  							<td><code>class</code></td>
  							<td>middleclass OOP 库</td>
  						</tr>
  						<tr>
  							<td><code>km</code></td>
  							<td>宏工具（klua.macros）</td>
  						</tr>
  						<tr>
  							<td><code>bit / band / bor / bnot</code></td>
  							<td>位运算</td>
  						</tr>
  						<tr>
  							<td><code>copy</code></td>
  							<td><code>table.deepclone</code> 的别名</td>
  						</tr>
  						<tr>
  							<td><code>clone</code></td>
  							<td><code>table.clone</code> 的别名</td>
  						</tr>
  						<tr>
  							<td><code>storage</code></td>
  							<td>all.storage 持久化存储</td>
  						</tr>
  						<tr>
  							<td><code>SU</code></td>
  							<td>script_utils 脚本工具</td>
  						</tr>
  						<tr>
  							<td><code>U</code></td>
  							<td>utils 通用工具</td>
  						</tr>
  					</tbody>
  				</table>
  
  				<h3>实体与模板操作</h3>
  				<pre><code><span class="cmt">-- 注册新模板（name: 模板名, ref: 派生自哪个已有模板）</span>
  RT(<span class="str">"my_tower"</span>, <span class="str">"base_tower"</span>)
  
  <span class="cmt">-- 获取已有模板的引用（可直接修改其字段）</span>
  <span class="kw">local</span> t = T(<span class="str">"hero_alleria"</span>)
  t.motion.max_speed = <span class="num">3.5</span> * FPS
  
  <span class="cmt">-- 为模板添加组件</span>
  AC(<span class="str">"my_tower"</span>, <span class="str">"comp_health"</span>, <span class="str">"comp_armor"</span>)
  
  <span class="cmt">-- 深拷贝一个组件（避免多个模板共享同一表）</span>
  <span class="kw">local</span> c = CC(<span class="str">"comp_health"</span>)
  
  <span class="cmt">-- 创建实体实例</span>
  <span class="kw">local</span> e = create_entity(<span class="str">"my_tower"</span>)
  
  <span class="cmt">-- 将实体加入插入队列</span>
  queue_insert(store, e)
  
  <span class="cmt">-- 将实体加入移除队列</span>
  queue_remove(store, e)
  
  <span class="cmt">-- 将伤害实体加入伤害队列</span>
  queue_damage(store, damage_entity)</code></pre>
  
  				<h3>数学工具</h3>
  				<pre><code><span class="cmt">-- 帧数转秒数（基于当前 FPS）</span>
  <span class="kw">local</span> seconds = fts(<span class="num">30</span>)   <span class="cmt">-- 30 帧 → 对应秒数</span>
  
  <span class="cmt">-- 角度转弧度</span>
  <span class="kw">local</span> rad = d2r(<span class="num">90</span>)       <span class="cmt">-- 90° → π/2</span></code></pre>
  			</section>
  
  			<!-- 8. mod_utils -->
  			<section id="mod_utils">
  				<h2 class="section-title">8. mod_utils 工具函数</h2>
  				<p>通过 <code>require("mod_utils")</code> 获取。</p>
  
  				<h3>mod_utils.a_db_reset(t)</h3>
  				<p>
  					批量更新动画数据库。传入一个动画定义表，函数会将其合并/删除到全局动画数据库
  					<code>A.db</code> 中。
  				</p>
  				<pre><code>mod_utils.<span class="fn">a_db_reset</span>({
      <span class="cmt">-- 修改现有动画（合并）</span>
      hero_idle = { fps = <span class="num">12</span> },
      <span class="cmt">-- 删除动画</span>
      hero_run = { removed = <span class="kw">true</span> },
      <span class="cmt">-- 图层展开（layerX 会被展开为 layer1, layer2, ...）</span>
      effect_layerX = {
          layer_from = <span class="num">1</span>, layer_to = <span class="num">3</span>,
          layer_prefix = <span class="str">"effect_%d_"</span>,
          fps = <span class="num">24</span>, group = <span class="str">"effects"</span>
      }
  })</code></pre>
  
  				<h3>mod_utils.apply_factor(t, k, factor [, is_int])</h3>
  				<p>
  					对表中某字段乘以
  					<code>factor</code>。若字段是数组则逐元素乘。<code
  						>is_int</code
  					>
  					为 <code>true</code> 时向上取整。
  				</p>
  				<pre><code><span class="cmt">-- 将绿兵的血量 * 1.5</span>
  mod_utils.<span class="fn">apply_factor</span>(T(<span class="str">"soldier_forest"</span>).health, <span class="str">"max"</span>, <span class="num">1.5</span>, <span class="kw">true</span>)</code></pre>
  
  				<h3>mod_utils.mixed_apply_factor(t, k, factor)</h3>
  				<p>
  					对实体的所有近战攻击（<code>melee.attacks</code>）、远程攻击（<code>ranged.attacks</code>）、
  					定时攻击（<code>timed_attacks.list</code>）的
  					<code>k</code> 字段统一乘以 <code>factor</code>。
  				</p>
  				<pre><code><span class="cmt">-- 将所有攻击冷却时间减半</span>
  mod_utils.<span class="fn">mixed_apply_factor</span>(T(<span class="str">"enemy_orc"</span>), <span class="str">"cooldown"</span>, <span class="num">0.5</span>)</code></pre>
  			</section>
  
  			<!-- 9. 示例 -->
  			<section id="example">
  				<h2 class="section-title">9. 示例：从零开发一个基础模组</h2>
  				<p>
  					本节通过一个完整的示例，带你由浅入深地了解模组开发的全流程。
  					示例模组名为
  					<code>stronger_archers</code
  					>，将逐步增强游戏中的弓箭手防御塔单位，
  					演示模板修改、钩子使用、配置文件分离和新模板注册四个核心能力。
  				</p>
  
  				<div class="callout info">
  					<b>示例说明</b>：本示例使用的实体名称（如
  					<code>tower_archer_1</code
  					>、<code>arrow_1</code>）仅供演示，
  					实际开发时请替换为游戏中真实的模板名称。可通过查阅游戏数据文件确认正确的名称。对于dove版，可查阅kr1目录里面的<code>game_templates.lua</code>,
  					<code>archer_towers.lua</code>,
  					<code>mage_towers.lua</code>,
  					<code>engineer_towers.lua</code>,
  					<code>barrack_towers.lua</code>, <code>enemies.lua</code>,
  					<code>boss.lua</code>, <code>heroes.lua</code>。
  				</div>
  
  				<!-- Step 1 -->
  				<h3>第一步：创建最小骨架</h3>
  				<p>
  					一个合法的模组只需两个文件：<code>config.lua</code>
  					和与目录同名的入口文件。
  					先把骨架搭起来，确认模组可以被系统识别和加载。
  				</p>
  
  				<p>目录结构：</p>
  				<div class="tree">
  					<span class="dir">mods/local/</span><br />
  					&nbsp;&nbsp;<span class="dir">└── stronger_archers/</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="file"
  						>├── config.lua</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 模组元信息</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="file"
  						>└── stronger_archers.lua</span
  					>&nbsp;&nbsp;&nbsp;<span class="note">← 模组入口</span>
  				</div>
  
  				<h4>config.lua</h4>
  				<pre><code><span class="kw">return</span> {
      name         = <span class="str">"强化弓箭手"</span>,
      entry        = <span class="str">"stronger_archers"</span>
      version      = <span class="str">"1.0.0"</span>,
      game_version = {<span class="str">"kr1"</span>},
      desc         = <span class="str">"提升弓箭手的攻击力与射程。"</span>,
      url          = <span class="str">""</span>,
      by           = <span class="str">"你的名字"</span>,
      category     = <span class="str">"tower"</span>
      enabled      = <span class="kw">true</span>,
      priority     = <span class="num">0</span>,
  }</code></pre>
  
  				<h4>stronger_archers.lua</h4>
  				<pre><code><span class="kw">local</span> hook_utils = <span class="fn">require</span>(<span class="str">"hook_utils"</span>)
  <span class="kw">local</span> HOOK = hook_utils.HOOK
  <span class="kw">local</span> hook = hook_utils:<span class="fn">new</span>()
  
  <span class="kw">function</span> hook:<span class="fn">init</span>(mod_data)
      self.mod_data = mod_data
      <span class="cmt">-- 目前什么都不做，只验证加载流程正常</span>
  <span class="kw">end</span>
  
  <span class="kw">return</span> hook</code></pre>
  
  				<p>
  					将上面两个文件放入
  					<code>mods/local/stronger_archers/</code
  					>，启动游戏后若没有报错， 则模组骨架已正常工作。
  				</p>
  
  				<!-- Step 2 -->
  				<h3>第二步：修改模板数据</h3>
  				<p>
  					游戏中所有单位、子弹、特效都以"模板"的形式存储在
  					<code>E</code>（entity_db）中。 使用全局函数
  					<code>T("模板名")</code> 可以获取并直接修改任意模板的字段。
  				</p>
  				<p>
  					修改模板的代码必须在游戏数据加载完成后才能运行，否则模板尚不存在。
  					标准做法是在 <code>init</code> 里注册一个
  					<code>E.load</code> 钩子， 在钩子内部（调用原始
  					<code>load</code> 之后）执行修改逻辑。
  				</p>
  
  				<h4>stronger_archers.lua（修改后）</h4>
  				<pre><code><span class="kw">local</span> hook_utils = <span class="fn">require</span>(<span class="str">"hook_utils"</span>)
  <span class="kw">local</span> HOOK = hook_utils.HOOK
  <span class="kw">local</span> hook = hook_utils:<span class="fn">new</span>()
  
  <span class="kw">function</span> hook:<span class="fn">init</span>(mod_data)
      self.mod_data = mod_data
      HOOK(E, <span class="str">"load"</span>, self.E.load)
  <span class="kw">end</span>
  
  <span class="cmt">-- E.load 钩子：在原始加载完成后修改模板</span>
  <span class="kw">function</span> hook.E.<span class="fn">load</span>(load, self)
      load(self)  <span class="cmt">-- 必须先调用原始加载</span>
  
      <span class="kw">local</span> archer = T(<span class="str">"tower_archer_1"</span>)
      <span class="kw">if</span> archer <span class="kw">then</span>
          <span class="cmt">-- 射程 + 50</span>
          archer.attacks.range = archer.attacks.range + <span class="num">50</span>
      <span class="kw">end</span>
  <span class="kw">end</span>
  
  <span class="kw">return</span> hook</code></pre>
  
  				<div class="callout tip">
  					<b>技巧</b>：用
  					<code>if archer then ... end</code> 做保护判断是个好习惯。
  					当模组跨版本运行时，某些模板可能并不存在，保护判断能防止加载时报错。
  				</div>
  
  				<!-- Step 3 -->
  				<h3>第三步：将数值提取到配置文件</h3>
  				<p>
  					把所有可调整的数值硬编码在入口文件里不便于维护。
  					推荐将它们放在独立的 Lua
  					文件中，使用者只需修改配置文件而无需接触主逻辑。
  				</p>
  
  				<p>新增 <code>config_archer.lua</code>：</p>
  				<div class="tree">
  					<span class="dir">stronger_archers/</span><br />
  					&nbsp;&nbsp;<span class="file">├── config.lua</span><br />
  					&nbsp;&nbsp;<span class="file"
  						>├── stronger_archers.lua</span
  					><br />
  					&nbsp;&nbsp;<span class="file">└── config_archer.lua</span
  					>&nbsp;&nbsp;&nbsp;<span class="note"
  						>← 新增：可调参数</span
  					>
  				</div>
  
  				<h4>config_archer.lua</h4>
  				<pre><code><span class="kw">return</span> {
      range_bonus   = <span class="num">50</span>,    <span class="cmt">-- 射程加成</span>
  }</code></pre>
  
  				<h4>stronger_archers.lua（使用配置文件）</h4>
  				<pre><code><span class="kw">local</span> hook_utils = <span class="fn">require</span>(<span class="str">"hook_utils"</span>)
  <span class="kw">local</span> HOOK = hook_utils.HOOK
  <span class="kw">local</span> hook = hook_utils:<span class="fn">new</span>()
  
  <span class="kw">function</span> hook:<span class="fn">init</span>(mod_data)
      self.mod_data = mod_data
      HOOK(E, <span class="str">"load"</span>, self.E.load)
  <span class="kw">end</span>
  
  <span class="kw">function</span> hook.E.<span class="fn">load</span>(load, self)
      load(self)
  
      <span class="cmt">-- 每次游戏加载时重新 require，确保热重载时配置也刷新</span>
      package.loaded.config_archer = <span class="kw">nil</span>
      <span class="kw">local</span> cfg = <span class="fn">require</span>(<span class="str">"config_archer"</span>)
  
      <span class="kw">local</span> archer = T(<span class="str">"archer"</span>)
      <span class="kw">if</span> archer <span class="kw">then</span>
          archer.attacks.range = archer.attacks.range + cfg.range_bonus
      <span class="kw">end</span>
  <span class="kw">end</span>
  
  <span class="kw">return</span> hook</code></pre>
  
  				<div class="callout warn">
  					<b>注意</b>：在 <code>E.load</code> 钩子内
  					<code>require</code> 其他模块前， 先将其从
  					<code>package.loaded</code> 中清除（置为
  					<code>nil</code>），
  					可以确保每次调用都重新加载最新内容，避免游戏重载时使用到旧的缓存数据。
  				</div>
  
  				<!-- Step 4 -->
  				<h3>第四步：注册新模板</h3>
  				<p>
  					如果只修改现有模板字段，所有使用该模板的实体都会受到影响。
  					当你只想让<em>部分</em>实体使用修改后的参数时，可以用
  					<code>E:register_t("新模板名", "父模板名")</code>（即全局
  					<code>RT</code>） 注册一个派生模板，再把它分配给指定实体。
  				</p>
  				<p>
  					下面的例子将弓箭手的普通箭矢替换为一个伤害更高的新子弹模板：
  				</p>
  
  				<h4>stronger_archers.lua（注册新模板）</h4>
  				<pre><code><span class="kw">local</span> hook_utils = <span class="fn">require</span>(<span class="str">"hook_utils"</span>)
  <span class="kw">local</span> HOOK = hook_utils.HOOK
  <span class="kw">local</span> hook = hook_utils:<span class="fn">new</span>()
  
  <span class="kw">function</span> hook:<span class="fn">init</span>(mod_data)
      self.mod_data = mod_data
      HOOK(E, <span class="str">"load"</span>, self.E.load)
  <span class="kw">end</span>
  
  <span class="kw">function</span> hook.E.<span class="fn">load</span>(load, self)
      load(self)
  
      package.loaded.config_archer = <span class="kw">nil</span>
      <span class="kw">local</span> cfg = <span class="fn">require</span>(<span class="str">"config_archer"</span>)
  
      <span class="cmt">-- 注册一个派生自 arrow_archer 的新箭矢模板</span>
      <span class="kw">local</span> tt = RT(<span class="str">"__strongeer_archers__arrow_archer_enhanced"</span>, <span class="str">"arrow_1"</span>)
      tt.bullet.damage_min = math.<span class="fn">ceil</span>(tt.bullet.damage_min * cfg.damage_factor)
      tt.bullet.damage_max = math.<span class="fn">ceil</span>(tt.bullet.damage_max * cfg.damage_factor)
  
      <span class="cmt">-- 让弓箭手使用新的箭矢模板，并扩大射程</span>
      <span class="kw">local</span> archer = T(<span class="str">"tower_archer_1"</span>)
      <span class="kw">if</span> archer <span class="kw">then</span>
          archer.attacks.list[<span class="num">1</span>].bullet = <span class="str">"__stronger_archers__arrow_archer_enhanced"</span>
          archer.attacks.range = archer.attacks.range + cfg.range_bonus
      <span class="kw">end</span>
  <span class="kw">end</span>
  
  <span class="kw">return</span> hook</code></pre>
  
  				<h4>config_archer.lua（更新）</h4>
  				<pre><code><span class="kw">return</span> {
      damage_factor = <span class="num">1.5</span>,   <span class="cmt">-- 箭矢伤害倍率</span>
      range_bonus   = <span class="num">50</span>,    <span class="cmt">-- 射程加成（像素）</span>
  }</code></pre>
  
  				<div class="callout tip">
  					<b>为什么要用派生模板而不是直接改原模板？</b><br />
  					直接修改
  					<code>arrow_1</code>
  					会影响所有使用它的实体。注册派生模板后，只有明确指定了
  					<code>"__stronger_archers__arrow_archer_enhanced"</code>
  					的实体才会使用新行为，对其余实体无副作用。
  				</div>
  				<div class="callout tip">
  					<b>为什么派生模板要加一个__插件名称__的前缀？</b><br />
  					不同插件中可能意外定义了相同名称的模板，当他们同时加载时就会发生冲突。加上模组名称前缀后，就可以保证冲突不发生了。
  				</div>
  
  				<h3>第五步：添加说明</h3>
  				<p>
  					一份说明可以让玩家更好地理解你的插件在做什么事情。于是，我们可以创建
  					README.md，在里面添加详细的说明。
  				</p>
  				<p>
  					比如说，对于我们这个简单的示例而言，README.md 的内容可能为：
  				</p>
  
  				<div class="readme-preview">
  					<div class="readme-preview-bar">
  						<span class="readme-icon">📄</span> README.md
  					</div>
  					<div class="readme-body">
  						<h1 class="rm-h1">强化弓箭手 (Stronger Archers)</h1>
  						<p>
  							一个简单的
  							<strong>kr1</strong>
  							模组，提升弓箭手防御塔的攻击力与射程。
  						</p>
  
  						<h2 class="rm-h2">效果</h2>
  						<ul>
  							<li>弓箭手射程 +50 像素</li>
  							<li>弓箭手箭矢伤害 ×1.5</li>
  						</ul>
  
  						<h2 class="rm-h2">安装</h2>
  						<p>
  							将 <code>stronger_archers/</code> 文件夹放入游戏的
  							<code>mods/local/</code> 目录，重启游戏即可生效。
  						</p>
  
  						<h2 class="rm-h2">配置</h2>
  						<p>编辑 <code>config_archer.lua</code> 可调整数值：</p>
  						<table>
  							<thead>
  								<tr>
  									<th>参数</th>
  									<th>默认值</th>
  									<th>说明</th>
  								</tr>
  							</thead>
  							<tbody>
  								<tr>
  									<td><code>range_bonus</code></td>
  									<td><code>50</code></td>
  									<td>射程加成（像素）</td>
  								</tr>
  								<tr>
  									<td><code>damage_factor</code></td>
  									<td><code>1.5</code></td>
  									<td>箭矢伤害倍率</td>
  								</tr>
  							</tbody>
  						</table>
  
  						<h2 class="rm-h2">作者</h2>
  						<p>你的名字 · v1.0.0</p>
  					</div>
  				</div>
  
  				<!-- Final structure -->
  				<h3>最终文件结构</h3>
  				<div class="tree">
  					<span class="dir">mods/local/</span><br />
  					&nbsp;&nbsp;<span class="dir">└── stronger_archers/</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="file"
  						>├── config.lua</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 模组元信息（名称、版本、作者等）</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="file"
  						>├── stronger_archers.lua</span
  					>&nbsp;&nbsp;&nbsp;<span class="note"
  						>← 入口：注册钩子、组装逻辑</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="file"
  						>├── config_archer.lua</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="note"
  						>← 用户可调数值配置</span
  					><br />
  					&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="file"
  						>└── README.md</span
  					>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span
  						class="note"
  						>← 可选，说明文档</span
  					>
  				</div>
  
  				<h3>完整开发流程回顾</h3>
  				<table>
  					<thead>
  						<tr>
  							<th>步骤</th>
  							<th>做了什么</th>
  							<th>涉及 API</th>
  						</tr>
  					</thead>
  					<tbody>
  						<tr>
  							<td>第一步</td>
  							<td>创建 config.lua + 空入口文件，验证加载流程</td>
  							<td>
  								<code>hook_utils:new()</code>,
  								<code>hook:init()</code>
  							</td>
  						</tr>
  						<tr>
  							<td>第二步</td>
  							<td>
  								注册
  								<code>E.load</code>
  								钩子，在数据加载后修改模板字段
  							</td>
  							<td>
  								<code>HOOK(E, "load", ...)</code>,
  								<code>T("...")</code>
  							</td>
  						</tr>
  						<tr>
  							<td>第三步</td>
  							<td>
  								将数值提取到 config_archer.lua，在钩子内 require
  							</td>
  							<td>
  								<code>package.loaded[k] = nil</code>,
  								<code>require(...)</code>
  							</td>
  						</tr>
  						<tr>
  							<td>第四步</td>
  							<td>
  								注册派生模板，将其指定给具体实体，避免副作用
  							</td>
  							<td><code>RT("新名", "父名")</code></td>
  						</tr>
  						<tr>
  							<td>第五步</td>
  							<td>
  								编写 README.md，向玩家说明模组用途与参数配置
  							</td>
  							<td>—</td>
  						</tr>
  					</tbody>
  				</table>
  			</section>
  		</div>
  		<!-- .page-wrap -->
</template>

<style scoped>

			/* TOC */
			nav.toc {
				background: var(--surface);
				border: 1px solid var(--border);
				border-radius: 8px;
				padding: 20px 24px;
				margin-bottom: 36px;
			}
			nav.toc h2 {
				font-size: 0.85rem;
				text-transform: uppercase;
				letter-spacing: 0.08em;
				color: var(--text-dim);
				margin-bottom: 10px;
			}
			nav.toc ol {
				padding-left: 20px;
			}
			nav.toc li {
				margin: 4px 0;
				font-size: 0.9rem;
			}

			/* Sections */
			section {
				margin-bottom: 48px;
			}
			h2.section-title {
				font-size: 1.4rem;
				color: #fff;
				border-left: 4px solid var(--accent);
				padding-left: 12px;
				margin-bottom: 16px;
			}

			/* Syntax token colors */
			.kw {
				color: #cc99cd;
			}
			.fn {
				color: #6fb3d2;
			}
			.str {
				color: #7ec699;
			}
			.cmt {
				color: #616e88;
				font-style: italic;
			}
			.num {
				color: #f08d49;
			}

			/* Directory tree */
			.tree {
				font-family: monospace;
				font-size: 0.875rem;
				background: var(--code-bg);
				border: 1px solid var(--border);
				border-radius: 8px;
				padding: 16px 20px;
				line-height: 1.8;
				color: #ced4da;
				margin: 12px 0 18px;
			}
			.tree .dir {
				color: var(--accent);
			}
			.tree .file {
				color: #ced4da;
			}
			.tree .note {
				color: var(--text-dim);
			}

			/* Bug note */
			.bug-card {
				background: var(--surface);
				border: 1px solid var(--border);
				border-radius: 8px;
				padding: 14px 18px;
				margin: 12px 0;
			}
			.bug-card .tag {
				display: inline-block;
				padding: 2px 8px;
				border-radius: 4px;
				font-size: 0.75rem;
				font-weight: 600;
				margin-right: 6px;
			}
			.tag.bug {
				background: #5c1a1a;
				color: var(--danger);
			}
			.tag.optim {
				background: #1a3d2b;
				color: var(--accent2);
			}
			.tag.design {
				background: #1a2f4a;
				color: var(--accent);
			}
			.bug-card code {
				font-size: 0.82rem;
			}

			/* README preview */
			.readme-preview {
				border: 1px solid var(--border);
				border-radius: 8px;
				overflow: hidden;
				margin: 14px 0 18px;
			}
			.readme-preview-bar {
				background: var(--surface);
				padding: 8px 16px;
				font-size: 0.82rem;
				color: var(--text-dim);
				border-bottom: 1px solid var(--border);
				display: flex;
				align-items: center;
				gap: 6px;
			}
			.readme-icon {
				font-size: 1rem;
			}
			.readme-body {
				padding: 20px 28px;
				background: #1c1d20;
				line-height: 1.75;
			}
			.readme-body .rm-h1 {
				font-size: 1.4rem;
				color: #fff;
				border-bottom: 1px solid var(--border);
				padding-bottom: 8px;
				margin: 0 0 14px;
				font-weight: 700;
			}
			.readme-body .rm-h2 {
				font-size: 1.05rem;
				color: #e0e0e0;
				border-bottom: 1px solid var(--border);
				padding-bottom: 4px;
				margin: 20px 0 10px;
				font-weight: 600;
			}
			.readme-body p {
				margin-bottom: 8px;
			}
			.readme-body ul {
				padding-left: 22px;
				margin-bottom: 10px;
			}
			.readme-body li {
				margin: 3px 0;
			}
		
</style>
