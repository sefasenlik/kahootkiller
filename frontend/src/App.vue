<template>
  <div id="app">
    <header>
      <div class="header-content">
        <div class="logo-container">
          <img src="/logo.png" alt="Hadoop Logo" class="logo">
        </div>
        <div class="header-right">
          <div class="language-selector">
            <button 
              @click="currentLang = 'en'" 
              :class="{ active: currentLang === 'en' }"
              class="lang-btn"
            >
              EN
            </button>
            <button 
              @click="currentLang = 'tr'" 
              :class="{ active: currentLang === 'tr' }"
              class="lang-btn"
            >
              TR
            </button>
          </div>
          <button 
            @click="menuOpen = !menuOpen" 
            class="hamburger-btn"
            :class="{ open: menuOpen }"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      <div class="nav" v-if="menuOpen">
        <button 
          @click="currentView = 'user'; menuOpen = false" 
          :class="{ active: currentView === 'user' }"
        >
          {{ t.userPanel }}
        </button>
        <button 
          @click="currentView = 'admin'; menuOpen = false" 
          :class="{ active: currentView === 'admin' }"
        >
          {{ t.adminPanel }}
        </button>
      </div>
    </header>

    <main>
      <UserPanel v-if="currentView === 'user'" :lang="currentLang" />
      <AdminPanel v-else :lang="currentLang" />
    </main>
    
    <Footer :lang="currentLang" />
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import UserPanel from './components/UserPanel.vue';
import AdminPanel from './components/AdminPanel.vue';
import Footer from './components/Footer.vue';
import { getTranslation } from './i18n.js';

export default {
  name: 'App',
  components: {
    UserPanel,
    AdminPanel,
    Footer
  },
  setup() {
    const currentView = ref('user');
    const currentLang = ref(localStorage.getItem('kahootkiller_lang') || 'en');
    const menuOpen = ref(false);

    const t = computed(() => getTranslation(currentLang.value));

    watch(currentLang, (newLang) => {
      localStorage.setItem('kahootkiller_lang', newLang);
    });

    return {
      currentView,
      currentLang,
      menuOpen,
      t
    };
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #0a0a0a 0%, #4a0e2a 100%);
  min-height: 100vh;
  position: relative;
}

body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('/background.png') repeat;
  background-size: 400px 400px;
  opacity: 0.05;
  pointer-events: none;
  z-index: 0;
}

#app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px;
  position: relative;
  z-index: 1;
}

header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-container {
  display: flex;
  align-items: center;
}

.logo {
  height: 60px;
  width: auto;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

header h1 {
  color: #c2185b;
  margin-bottom: 0;
  font-size: 2em;
}

.language-selector {
  display: flex;
  gap: 8px;
}

.lang-btn {
  padding: 8px 16px;
  border: 2px solid #c2185b;
  background: white;
  color: #c2185b;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.lang-btn:hover {
  background: #2a1a20;
  color: white;
}

.lang-btn.active {
  background: #c2185b;
  color: white;
}

.hamburger-btn {
  width: 40px;
  height: 40px;
  background: #2a1a20;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  padding: 8px;
  transition: all 0.3s ease;
}

.hamburger-btn:hover {
  background: #3a2a30;
}

.hamburger-btn span {
  display: block;
  width: 20px;
  height: 2px;
  background: white;
  transition: all 0.3s ease;
  border-radius: 2px;
}

.hamburger-btn.open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.hamburger-btn.open span:nth-child(2) {
  opacity: 0;
}

.hamburger-btn.open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.nav {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

.nav button {
  padding: 12px 24px;
  border: 2px solid #c2185b;
  background: white;
  color: #c2185b;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.nav button:hover {
  background: #2a1a20;
  color: white;
}

.nav button.active {
  background: #c2185b;
  color: white;
}

main {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-height: 500px;
}

button {
  cursor: pointer;
  font-family: inherit;
}

input, textarea {
  font-family: inherit;
}

@media (max-width: 540px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .logo-container {
    justify-content: center;
  }

  .header-right {
    justify-content: center;
  }
}
</style>
