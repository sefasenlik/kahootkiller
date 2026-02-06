<template>
  <div class="user-panel">
    <div class="panel-header">
      <h2>{{ t.userPanel }}</h2>
      <button v-if="username" @click="loadQuestions" class="btn-refresh" :disabled="loading">
        {{ loading ? '⟳' : '🔄' }} {{ t.refresh }}
      </button>
    </div>
    
    <div v-if="!username" class="username-form">
      <h3>{{ t.chooseNickname }}</h3>
      <p class="warning-text">{{ t.nicknameWarning }}</p>
      <input 
        v-model="usernameInput" 
        :placeholder="t.yourName"
        @keyup.enter="setUsername"
      />
      <button @click="setUsername">{{ t.continue }}</button>
    </div>

    <div v-else>
      <div class="user-info">
        <p>{{ t.welcome }}, <strong>{{ username }}</strong>!</p>
        <button @click="changeUsername" class="btn-change-username">{{ t.changeUsername || 'Change Username' }}</button>
      </div>

      <div v-if="loading" class="loading">{{ t.loadingQuestions }}</div>

      <div v-else-if="questions.length === 0" class="no-questions">
        <p>{{ t.noActiveQuestions }}</p>
      </div>

      <div v-else class="questions-list">
        <div v-for="question in questions" :key="question.id" class="question-card">
          <h3>{{ question.question }}</h3>
          
          <div class="question-meta">
            <span v-if="question.deadline">
              ⏰ {{ t.deadline }}: {{ formatDeadline(question.deadline) }}
            </span>
            <span v-if="isDeadlinePassed(question.deadline)" class="deadline-expired">
              ⛔ {{ t.deadlineExpired }}
            </span>
          </div>

          <div v-if="isDeadlinePassed(question.deadline)" class="deadline-passed">
            ⏰ {{ t.deadlinePassed }}
          </div>

          <div v-else-if="question.hasResponded" class="already-responded">
            ✅ {{ t.alreadyAnswered }}
          </div>

          <div v-else class="answer-form">
            <textarea 
              v-model="question.userAnswer" 
              :placeholder="t.typeAnswer"
              :maxlength="question.character_limit || undefined"
              rows="4"
            ></textarea>
            <div v-if="question.character_limit" class="character-counter">
              {{ question.character_limit - (question.userAnswer?.length || 0) }} {{ t.charactersRemaining }}
            </div>
            <div class="button-row">
              <button 
                @click="submitAnswer(question)" 
                :disabled="!question.userAnswer || question.submitting || isDeadlinePassed(question.deadline)"
                class="submit-btn"
              >
                <span class="btn-text-full">{{ question.submitting ? t.submitting : isDeadlinePassed(question.deadline) ? t.deadlinePassedBtn : t.submitAnswer }}</span>
                <span class="btn-text-short">✓</span>
              </button>
              <button 
                v-if="question.image_url"
                @click="openImageModal(question.image_url)"
                class="image-btn"
                type="button"
              >
                <span class="btn-text-full">🖼️ {{ t.viewImage || 'View Image' }}</span>
                <span class="btn-text-short">🖼️</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Image Modal -->
    <div v-if="showImageModal" class="modal-overlay" @click="closeImageModal">
      <div class="modal-content" @click.stop>
        <button class="modal-close" @click="closeImageModal">✕</button>
        <img :src="modalImageUrl" alt="Question image" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';
import { getTranslation } from '../i18n.js';

export default {
  name: 'UserPanel',
  props: {
    lang: {
      type: String,
      default: 'en'
    }
  },
  setup(props) {
    const username = ref('');
    const usernameInput = ref('');
    const userId = ref('');
    const questions = ref([]);
    const loading = ref(false);
    const showImageModal = ref(false);
    const modalImageUrl = ref('');

    const t = computed(() => getTranslation(props.lang));

    // Generate a 16-digit unique user ID
    const generateUserId = () => {
      let id = '';
      for (let i = 0; i < 16; i++) {
        id += Math.floor(Math.random() * 10);
      }
      return id;
    };

    // Load username and userId from localStorage on mount
    onMounted(() => {
      const savedUsername = localStorage.getItem('kahootkiller_username');
      const savedUserId = localStorage.getItem('kahootkiller_user_id');
      
      if (savedUserId) {
        userId.value = savedUserId;
      } else {
        // Generate new user ID if not found
        userId.value = generateUserId();
        localStorage.setItem('kahootkiller_user_id', userId.value);
      }
      
      if (savedUsername) {
        username.value = savedUsername;
        loadQuestions();
      }
    });

    const setUsername = () => {
      if (usernameInput.value.trim()) {
        const newUsername = usernameInput.value.trim();
        username.value = newUsername;
        // Save username to localStorage permanently
        localStorage.setItem('kahootkiller_username', newUsername);
        loadQuestions();
      }
    };

    const loadQuestions = async () => {
      loading.value = true;
      try {
        const response = await axios.get('/api/questions');
        questions.value = await Promise.all(
          response.data.map(async (q) => {
            const hasRespondedResp = await axios.get(`/api/questions/${q.id}/check/${userId.value}`);
            return {
              ...q,
              userAnswer: '',
              submitting: false,
              hasResponded: hasRespondedResp.data.hasResponded
            };
          })
        );
      } catch (error) {
        console.error('Error loading questions:', error);
        alert(t.value.failedToLoad);
      } finally {
        loading.value = false;
      }
    };

    const submitAnswer = async (question) => {
      if (!question.userAnswer.trim()) return;

      question.submitting = true;
      try {
        await axios.post(`/api/questions/${question.id}/respond`, {
          user_id: userId.value,
          username: username.value,
          answer: question.userAnswer
        });
        
        alert(t.value.answerSubmitted);
        question.hasResponded = true;
        question.userAnswer = '';
      } catch (error) {
        console.error('Error submitting answer:', error);
        alert(error.response?.data?.error || t.value.failedToSubmit);
      } finally {
        question.submitting = false;
      }
    };

    const formatDeadline = (deadline) => {
      return new Date(deadline).toLocaleString();
    };

    const isDeadlinePassed = (deadline) => {
      if (!deadline) return false;
      return new Date(deadline) < new Date();
    };

    const changeUsername = () => {
      const newName = prompt(t.value.enterNewUsername || 'Enter new username:', username.value);
      if (newName && newName.trim() && newName.trim() !== username.value) {
        username.value = newName.trim();
        localStorage.setItem('kahootkiller_username', newName.trim());
      }
    };

    const openImageModal = (imageUrl) => {
      modalImageUrl.value = imageUrl;
      showImageModal.value = true;
    };

    const closeImageModal = () => {
      showImageModal.value = false;
      modalImageUrl.value = '';
    };

    watch(username, (newUsername) => {
      if (newUsername) {
        loadQuestions();
      }
    });

    return {
      username,
      usernameInput,
      userId,
      questions,
      loading,
      setUsername,
      loadQuestions,
      submitAnswer,
      formatDeadline,
      isDeadlinePassed,
      changeUsername,
      showImageModal,
      modalImageUrl,
      openImageModal,
      closeImageModal,
      t
    };
  }
};
</script>

<style scoped>
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.user-panel h2 {
  color: #c2185b;
  margin-bottom: 0;
  font-size: 1.8em;
}

.btn-refresh {
  padding: 8px 16px;
  background: white;
  color: #c2185b;
  border: 2px solid #c2185b;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-refresh:hover {
  background: #c2185b;
  color: white;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-refresh:disabled:hover {
  background: white;
  color: #c2185b;
}

.username-form {
  max-width: 400px;
  margin: 40px auto;
  text-align: center;
}

.username-form h3 {
  margin-bottom: 16px;
  color: #333;
}

.warning-text {
  color: #c2185b;
  font-weight: 600;
  margin-bottom: 12px;
  font-size: 14px;
}

.username-form input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 12px;
}

.username-form button {
  width: 100%;
  padding: 12px;
  background: #c2185b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #2a1a20;
  border-radius: 8px;
  margin-bottom: 24px;
  color: white;
}

.btn-change-username {
  padding: 8px 16px;
  background: #c2185b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-change-username:hover {
  background: #880e4f;
}

.btn-secondary {
  padding: 8px 16px;
  background: white;
  color: #c2185b;
  border: 2px solid #c2185b;
  border-radius: 6px;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-questions {
  text-align: center;
  padding: 40px;
  color: #666;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.question-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 24px;
  background: #fafafa;
}

.question-card h3 {
  color: #333;
  margin-bottom: 12px;
  font-size: 1.3em;
}

.question-meta {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
}

.already-responded {
  padding: 12px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 8px;
  font-weight: 600;
}

.deadline-passed {
  padding: 12px;
  background: #2a1a20;
  color: #ff9800;
  border-radius: 8px;
  font-weight: 600;
}

.deadline-expired {
  color: #ff9800;
  font-weight: 700;
  margin-left: 16px;
}

.answer-form textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 12px;
  resize: vertical;
}

.character-counter {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  text-align: right;
}

.button-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.submit-btn {
  flex: 1;
  max-width: 200px;
  padding: 12px 24px;
  background: #c2185b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-text-short {
  display: none;
}

@media (max-width: 450px) {
  .btn-text-full {
    display: none;
  }
  .btn-text-short {
    display: inline;
  }
  .submit-btn {
    padding: 12px 16px;
    max-width: 60px;
    min-height: 48px;
    font-size: 20px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .image-btn {
    padding: 12px 16px;
    min-height: 48px;
    font-size: 20px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.image-btn {
  padding: 12px 20px;
  background: #2a1a20;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.3s;
}

.image-btn:hover {
  background: #333;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-content img {
  max-width: 100%;
  max-height: 80vh;
  display: block;
  border-radius: 8px;
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
  z-index: 1;
}

.modal-close:hover {
  background: rgba(194, 24, 91, 0.9);
}
</style>
