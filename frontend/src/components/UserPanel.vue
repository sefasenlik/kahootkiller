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
            <button 
              @click="submitAnswer(question)" 
              :disabled="!question.userAnswer || question.submitting || isDeadlinePassed(question.deadline)"
            >
              {{ question.submitting ? t.submitting : isDeadlinePassed(question.deadline) ? t.deadlinePassedBtn : t.submitAnswer }}
            </button>
          </div>
        </div>
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

.answer-form button {
  padding: 12px 24px;
  background: #c2185b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
}

.answer-form button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
