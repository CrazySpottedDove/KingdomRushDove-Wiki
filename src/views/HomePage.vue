<script setup lang="ts">
</script>

<template>
  <div class="page-wrap" style="max-width:900px;margin:0 auto;padding:0 16px 60px;">
    <header>
      <h1>王国保卫战 Dove 版</h1>
      <p>KingdomRushDove · 社区服务器</p>
    </header>

    <div class="notice">
      如可访问 IPv6 网络，请优先使用
      <a href="https://krdovedownload6.crazyspotteddove.top:52000">IPv6 官网</a>，IPv4 官网网速较慢。
    </div>

    <h2 class="sec">索引</h2>
    <div class="nav-grid">
      <a class="nav-card" href="/_assets">
        <div class="icon">🎨</div>
        <div class="label">美术资源</div>
      </a>
      <router-link class="nav-card" to="/history">
        <div class="icon">📋</div>
        <div class="label">更新历史</div>
      </router-link>
      <router-link class="nav-card" to="/plugins">
        <div class="icon">🧩</div>
        <div class="label">插件商店</div>
      </router-link>
      <router-link class="nav-card" to="/challenges">
        <div class="icon">🏁</div>
        <div class="label">挑战</div>
      </router-link>
      <router-link class="nav-card" to="/wiki/plugin_guide">
        <div class="icon">📖</div>
        <div class="label">插件开发文档</div>
      </router-link>
      <router-link class="nav-card" to="/changelog">
        <div class="icon">📰</div>
        <div class="label">改版介绍</div>
      </router-link>
    </div>

    <h2 class="sec">下载说明</h2>
    <div class="download-notice">
      <p>为减轻服务器网络带宽压力，提供更稳定的插件服务和更新服务，现已不支持通过服务器下载游戏本体。可尝试从 <a href="https://pan.quark.cn/s/f79b8c288102?pwd=V2Ec">夸克网盘链接</a>，或进入交流 QQ 群 698678477 获取资源。其余获取渠道均为非官方渠道，不保证时效性和安全性。</p>
    </div>

    <h2 class="sec">赞赏</h2>
    <div class="donate-wrap">
      <p>如果你觉得做得不错，请作者喝杯牢大茶吧，这是对我很好的鼓励！</p>
      <img :src="'/assets/donate.jpg'" alt="微信赞赏码" />
    </div>

    <h2 class="sec">问题自查</h2>
    <h3>显卡驱动问题</h3>
    <ul>
      <li>问题表现：Windows 端双击启动器，短暂跳出小黑框后程序结束。</li>
      <li>可能原因：电脑恰好使用 AMD 集成显卡，且使用了过于老旧的 AMD 显卡驱动，对部分 OpenGL 的 API 支持有 bug。</li>
      <li>已知案例：版本 31.0.12016.9 的 AMD VGA Driver 集成显卡驱动。</li>
      <li>修复方式：更新显卡驱动。</li>
    </ul>

    <h2 class="sec">群聊</h2>
    <ul class="qq-list">
      <li>交流 QQ 群（死鱼定期清理）：698678477。</li>
      <li>毁灭者是王国保卫战1代的第一个boss，头上长了2个角。</li>
      <li>如对插件开发有兴趣，可加入 QQ 群 <strong>1025619048</strong>。</li>
    </ul>
  </div>
</template>

<style scoped>
h2.sec {
  font-size: 1.3rem;
  border-left: 4px solid var(--accent);
  padding-left: 12px;
  margin: 36px 0 16px;
}
.nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 40px;
}
.nav-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 18px 16px;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
  text-decoration: none;
  display: block;
}
.nav-card:hover {
  border-color: var(--accent);
  background: #2a2b31;
  text-decoration: none;
}
.nav-card .icon { font-size: 1.6rem; margin-bottom: 8px; }
.nav-card .label { color: #fff; font-size: 0.9rem; font-weight: 600; }
.download-notice {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 24px;
  font-size: .95rem;
  line-height: 1.7;
}
.download-notice a { color: var(--accent); }
.qq-list { list-style: none; padding: 0; }
.qq-list li {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  margin: 8px 0;
  font-size: 0.92rem;
}
.donate-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
}
.donate-wrap img {
  width: 240px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.donate-wrap p { color: var(--muted, #aaa); font-size: 0.9rem; margin: 0; }
</style>
