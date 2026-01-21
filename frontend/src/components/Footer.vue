<template>
  <footer class="panel-footer">
    <a href="https://t.me/sefasenlik_ru" target="_blank" rel="noopener noreferrer">
      <img src="/sefa_stamp.png" alt="Sefa's Stamp" class="footer-stamp">
    </a>
    <div class="footer-text">
      <p>{{ t.developedBy }}</p>
      <p>{{ t.copyright }}</p>
      <p><a href="https://github.com/sefasenlik/hadoop" target="_blank" rel="noopener noreferrer">{{ t.projectRepository }}</a></p>
    </div>
  </footer>
</template>

<script>
import { computed } from 'vue';
import { getTranslation } from '../i18n.js';

export default {
  name: 'Footer',
  props: {
    lang: {
      type: String,
      default: 'en'
    }
  },
  setup(props) {
    const t = computed(() => getTranslation(props.lang));
    
    return {
      t
    };
  }
};
</script>

<style scoped>
.panel-footer {
  padding-top: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.footer-stamp {
  height: 65px;
  width: auto;
  object-fit: contain;
}

.footer-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.footer-text p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.footer-text a {
  color: #c2185b;
  text-decoration: none;
  font-weight: 600;
}

.footer-text a:hover {
  text-decoration: underline;
}
</style>
