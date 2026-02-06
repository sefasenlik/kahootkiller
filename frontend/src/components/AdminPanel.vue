<template>
  <div class="admin-panel">
    <h2>{{ t.adminPanel }}</h2>

    <div v-if="!authenticated" class="auth-form">
      <h3>{{ t.enterAdminPassword }}</h3>
      <input 
        v-model="password" 
        type="password" 
        :placeholder="t.password"
        @keyup.enter="authenticate"
      />
      <button @click="authenticate">{{ t.login }}</button>
      <p v-if="authError" class="error">{{ authError }}</p>
    </div>

    <div v-else>
      <div class="admin-actions">
        <button @click="showAddQuestion = !showAddQuestion" class="btn-primary">
          {{ showAddQuestion ? t.cancel : t.addNewQuestion }}
        </button>
        <button @click="loadQuestions" class="btn-secondary">{{ t.refresh }}</button>
      </div>

      <!-- Add Question Form -->
      <div v-if="showAddQuestion" class="add-question-form">
        <h3>{{ t.addQuestion }}</h3>
        <div class="form-group">
          <label>{{ t.question }}:</label>
          <textarea 
            v-model="newQuestion.question" 
            :placeholder="t.enterQuestion"
            rows="3"
          ></textarea>
        </div>
        <div class="form-group">
          <label>{{ t.correctAnswer }}:</label>
          <textarea 
            v-model="newQuestion.correct_answer" 
            :placeholder="t.enterCorrectAnswer"
            rows="3"
          ></textarea>
        </div>
        <div class="form-group">
          <label>{{ t.deadlineOptional }}:</label>
          <input 
            v-model="newQuestion.deadline" 
            type="datetime-local"
          />
        </div>
        <div class="form-group">
          <label>{{ t.characterLimit }}:</label>
          <input 
            v-model.number="newQuestion.character_limit" 
            type="number"
            :placeholder="t.characterLimitPlaceholder"
            min="1"
          />
        </div>
        <div class="form-group">
          <label>{{ t.imageUrl || 'Image (optional)' }}:</label>
          <div class="upload-options">
            <button 
              type="button" 
              @click="uploadMode = 'url'" 
              :class="['upload-mode-btn', { active: uploadMode === 'url' }]"
            >
              📝 {{ t.pasteUrl || 'Paste URL' }}
            </button>
            <button 
              type="button" 
              @click="uploadMode = 'file'" 
              :class="['upload-mode-btn', { active: uploadMode === 'file' }]"
            >
              📁 {{ t.uploadFile || 'Upload File' }}
            </button>
          </div>
          
          <div v-if="uploadMode === 'url'" class="url-input">
            <input 
              v-model="newQuestion.image_url" 
              type="text"
              :placeholder="t.imageUrlPlaceholder || 'Enter image URL (https://...)'"
            />
          </div>
          
          <div v-else class="file-input">
            <input 
              type="file" 
              ref="fileInput"
              @change="handleFileSelect"
              accept="image/*"
              id="image-upload"
            />
            <label for="image-upload" class="file-upload-label">
              {{ selectedFileName || (t.chooseFile || 'Choose an image file') }}
            </label>
            <button 
              v-if="selectedFile" 
              type="button" 
              @click="uploadImage" 
              :disabled="uploading"
              class="upload-btn"
            >
              {{ uploading ? (t.uploading || 'Uploading...') : (t.upload || 'Upload') }}
            </button>
          </div>
          
          <div v-if="newQuestion.image_url" class="image-preview">
            <img :src="newQuestion.image_url" alt="Preview" @error="handleImageError" />
            <button type="button" @click="removeImage" class="remove-image-btn">✕</button>
          </div>
        </div>
        <button @click="addQuestion" :disabled="!newQuestion.question || !newQuestion.correct_answer">
          {{ t.addQuestionBtn }}
        </button>
      </div>

      <!-- Questions List -->
      <div v-if="loading" class="loading">{{ t.loadingQuestions }}</div>
      
      <div v-else class="questions-admin-list">
        <div v-if="questions.length === 0" class="no-questions">
          {{ t.noQuestionsYet }}
        </div>

        <div v-for="(question, index) in questions" :key="question.id" class="admin-question-card">
          <div class="question-main-accordion">
            <button 
              @click="question.showContent = !question.showContent" 
              class="question-accordion-toggle"
            >
              <span class="question-number">{{ question.showContent ? '▼' : '▶' }} Question {{ index + 1 }}</span>
              <span :class="question.enabled ? 'status-enabled' : 'status-disabled'">
                {{ question.enabled ? '✅ ' + t.enabled : '❌ ' + t.disabled }}
              </span>
            </button>
          </div>

          <div v-if="question.showContent" class="question-content">
            <div class="question-header">
              <div>
                <h3>{{ question.question }}</h3>
                <div v-if="question.image_url" class="question-image">
                  <img :src="question.image_url" alt="Question image" />
                </div>
                <p class="meta">
                  {{ t.created }}: {{ formatDate(question.created_at) }} | 
                  {{ t.responses }}: {{ question.response_count }}
                </p>
                <p v-if="question.deadline" class="deadline">
                  {{ t.deadline }}: {{ formatDate(question.deadline) }}
                </p>
                <p v-if="question.character_limit" class="character-limit-info">
                  {{ t.characterLimit }}: {{ question.character_limit }}
                </p>
              </div>
            </div>

            <div class="correct-answer-accordion">
              <button 
                @click="question.showAnswer = !question.showAnswer" 
                class="accordion-toggle"
              >
                {{ question.showAnswer ? '▼' : '▶' }} {{ t.correctAnswer }}
              </button>
              <div v-if="question.showAnswer" class="correct-answer">
                {{ question.correct_answer }}
              </div>
            </div>

            <div class="question-actions">
              <button @click="toggleQuestion(question)" class="btn-toggle">
                {{ question.enabled ? t.disable : t.enable }}
              </button>
              <button @click="viewResponses(question)" class="btn-view">
                {{ t.viewResponses }} ({{ question.response_count }})
              </button>
              <button 
                @click="viewResults(question)" 
                class="btn-results"
                :disabled="question.response_count === 0 || !question.has_scored_responses"
              >
                {{ t.viewResults }}
              </button>
              <button 
                @click="scoreQuestion(question)" 
                class="btn-score"
                :disabled="question.response_count === 0 || question.scoring"
              >
                <span v-if="question.scoring" class="spinner"></span>
                {{ question.scoring ? t.scoring : t.scoreWithAI }}
              </button>
              <button @click="deleteQuestion(question)" class="btn-delete">
                {{ t.delete }}
              </button>
            </div>

            <!-- Responses View (No Scores) -->
            <div v-if="selectedQuestion?.id === question.id && !viewingResults && responses.length > 0" class="responses-section">
            <h4>{{ t.userResponses }}:</h4>
            <div class="responses-list">
              <div v-for="response in responses" :key="response.id" class="response-item">
                <div class="response-header">
                  <strong>{{ formatUsername(response) }}</strong>
                  <span class="response-time">{{ formatDate(response.submitted_at) }}</span>
                </div>
                <div class="response-answer">{{ response.answer }}</div>
              </div>
            </div>
          </div>

          <!-- Results View (With Scores) -->
          <div v-if="selectedQuestion?.id === question.id && viewingResults && responses.length > 0" class="responses-section">
            <h4>{{ t.userResponses }} - {{ t.viewResults }}:</h4>
            <div class="responses-list">
              <div 
                v-for="(response, index) in responses" 
                :key="response.id" 
                class="response-item"
                :class="getPodiumClass(index)"
              >
                <div class="response-header">
                  <strong>
                    <span v-if="index === 0">🥇 </span>
                    <span v-else-if="index === 1">🥈 </span>
                    <span v-else-if="index === 2">🥉 </span>
                    {{ formatUsername(response) }}
                  </strong>
                  <span class="response-time">{{ formatDate(response.submitted_at) }}</span>
                </div>
                <div class="response-answer">{{ response.answer }}</div>
                <div v-if="response.score !== null" class="response-score">
                  <span class="score-badge" :class="getScoreClass(response.score)">
                    {{ t.score }}: {{ response.score }}/100
                  </span>
                  <p class="feedback">{{ response.ai_feedback }}</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { getTranslation } from '../i18n.js';

export default {
  name: 'AdminPanel',
  props: {
    lang: {
      type: String,
      default: 'en'
    }
  },
  setup(props) {
    const authenticated = ref(false);
    const password = ref('');
    const authError = ref('');
    const showAddQuestion = ref(false);
    const loading = ref(false);
    const questions = ref([]);
    const selectedQuestion = ref(null);
    const responses = ref([]);
    const viewingResults = ref(false);
    const scoringQuestions = ref(new Set());
    const uploadMode = ref('url');
    const selectedFile = ref(null);
    const selectedFileName = ref('');
    const uploading = ref(false);
    const fileInput = ref(null);

    const t = computed(() => getTranslation(props.lang));

    const newQuestion = ref({
      question: '',
      correct_answer: '',
      deadline: '',
      character_limit: null,
      image_url: ''
    });

    const authenticate = async () => {
      try {
        await axios.post('/api/admin/verify', { password: password.value });
        authenticated.value = true;
        authError.value = '';
        loadQuestions();
      } catch (error) {
        authError.value = t.value.invalidPassword;
      }
    };

    const loadQuestions = async () => {
      loading.value = true;
      try {
        const response = await axios.post('/api/admin/questions/list', { 
          password: password.value 
        });
        questions.value = response.data.map(q => ({
          ...q,
          showAnswer: false,
          showContent: false,
          scoring: false
        }));
      } catch (error) {
        console.error('Error loading questions:', error);
        alert('Failed to load questions');
      } finally {
        loading.value = false;
      }
    };

    const addQuestion = async () => {
      try {
        await axios.post('/api/admin/questions', {
          password: password.value,
          ...newQuestion.value
        });
        
        alert(t.value.questionAdded);
        newQuestion.value = {
          question: '',
          correct_answer: '',
          deadline: '',
          character_limit: null,
          image_url: ''
        };
        showAddQuestion.value = false;
        loadQuestions();
      } catch (error) {
        console.error('Error adding question:', error);
        alert(t.value.failedToAdd);
      }
    };

    const toggleQuestion = async (question) => {
      try {
        await axios.post(`/api/admin/questions/${question.id}/toggle`, {
          password: password.value
        });
        loadQuestions();
      } catch (error) {
        console.error('Error toggling question:', error);
        alert(t.value.failedToToggle);
      }
    };

    const viewResponses = async (question) => {
      if (selectedQuestion.value?.id === question.id && !viewingResults.value) {
        selectedQuestion.value = null;
        responses.value = [];
        return;
      }

      try {
        const response = await axios.post(`/api/admin/questions/${question.id}/responses`, {
          password: password.value
        });
        selectedQuestion.value = question;
        responses.value = response.data;
        viewingResults.value = false;
      } catch (error) {
        console.error('Error loading responses:', error);
        alert(t.value.failedToLoadResponses);
      }
    };

    const viewResults = async (question) => {
      if (selectedQuestion.value?.id === question.id && viewingResults.value) {
        selectedQuestion.value = null;
        responses.value = [];
        viewingResults.value = false;
        return;
      }

      try {
        const response = await axios.post(`/api/admin/questions/${question.id}/responses`, {
          password: password.value
        });
        selectedQuestion.value = question;
        // Sort by score (highest first), put unscored at the end
        responses.value = response.data.sort((a, b) => {
          if (a.score === null) return 1;
          if (b.score === null) return -1;
          return b.score - a.score;
        });
        viewingResults.value = true;
      } catch (error) {
        console.error('Error loading results:', error);
        alert(t.value.failedToLoadResponses);
      }
    };

    const scoreQuestion = async (question) => {
      if (!confirm(t.value.confirmScore)) {
        return;
      }

      question.scoring = true;
      try {
        const response = await axios.post(`/api/admin/questions/${question.id}/score`, {
          password: password.value
        });
        
        // Log AI prompt and response for debugging
        if (response.data.debug) {
          console.group('🤖 AI Scoring Debug Info');
          console.log('📝 Prompt sent to AI:', response.data.debug.prompt);
          console.log('💬 AI Response:', response.data.debug.ai_response);
          console.groupEnd();
        }
        
        alert(t.value.scoredSuccess + `\n${response.data.scored_count} ${t.value.responses.toLowerCase()}`);
        
        // Refresh questions list to update has_scored_responses
        await loadQuestions();
        
        // Refresh responses if currently viewing
        if (selectedQuestion.value?.id === question.id) {
          viewResponses(question);
        }
      } catch (error) {
        console.error('Error scoring responses:', error);
        alert(t.value.failedToScore + ': ' + (error.response?.data?.error || error.message));
      } finally {
        question.scoring = false;
      }
    };

    const deleteQuestion = async (question) => {
      if (!confirm(t.value.confirmDelete)) {
        return;
      }

      try {
        await axios.post(`/api/admin/questions/${question.id}/delete`, {
          password: password.value
        });
        alert(t.value.questionDeleted);
        loadQuestions();
      } catch (error) {
        console.error('Error deleting question:', error);
        alert(t.value.failedToDelete);
      }
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString();
    };
    const formatUsername = (response) => {
      if (response.user_id && response.user_id.length >= 4) {
        const last4 = response.user_id.slice(-4);
        return `${response.username}#${last4}`;
      }
      return response.username;
    };
    const getScoreClass = (score) => {
      if (score >= 80) return 'score-excellent';
      if (score >= 60) return 'score-good';
      if (score >= 40) return 'score-fair';
      return 'score-poor';
    };

    const hasScores = (question) => {
      return question.response_count > 0;
    };

    const getPodiumClass = (index) => {
      if (index === 0) return 'podium-gold';
      if (index === 1) return 'podium-silver';
      if (index === 2) return 'podium-bronze';
      return '';
    };

    const handleImageError = (event) => {
      event.target.style.display = 'none';
    };

    const handleFileSelect = (event) => {
      const file = event.target.files[0];
      if (file) {
        selectedFile.value = file;
        selectedFileName.value = file.name;
      }
    };

    const uploadImage = async () => {
      if (!selectedFile.value) return;
      
      uploading.value = true;
      try {
        const formData = new FormData();
        formData.append('image', selectedFile.value);
        
        const response = await axios.post('/api/admin/upload-image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        newQuestion.value.image_url = response.data.imageUrl;
        selectedFile.value = null;
        selectedFileName.value = '';
        if (fileInput.value) {
          fileInput.value.value = '';
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert(t.value.uploadFailed || 'Failed to upload image. Please try again.');
      } finally {
        uploading.value = false;
      }
    };

    const removeImage = () => {
      newQuestion.value.image_url = '';
      selectedFile.value = null;
      selectedFileName.value = '';
      if (fileInput.value) {
        fileInput.value.value = '';
      }
    };

    return {
      authenticated,
      password,
      authError,
      showAddQuestion,
      loading,
      questions,
      newQuestion,
      selectedQuestion,
      responses,
      authenticate,
      loadQuestions,
      addQuestion,
      toggleQuestion,
      viewResponses,
      viewResults,
      scoreQuestion,
      deleteQuestion,
      formatDate,
      formatUsername,
      getScoreClass,
      hasScores,
      getPodiumClass,
      viewingResults,
      handleImageError,
      uploadMode,
      selectedFile,
      selectedFileName,
      uploading,
      fileInput,
      handleFileSelect,
      uploadImage,
      removeImage,
      t
    };
  }
};
</script>

<style scoped>
.admin-panel h2 {
  color: #c2185b;
  margin-bottom: 24px;
  font-size: 1.8em;
}

.auth-form {
  max-width: 400px;
  margin: 40px auto;
  text-align: center;
}

.auth-form h3 {
  margin-bottom: 16px;
}

.auth-form input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 12px;
}

.auth-form button {
  width: 100%;
  padding: 12px;
  background: #c2185b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
}

.error {
  color: #d32f2f;
  margin-top: 8px;
}

.admin-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn-primary {
  padding: 12px 24px;
  background: #c2185b;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
}

.btn-secondary {
  padding: 12px 24px;
  background: white;
  color: #c2185b;
  border: 2px solid #c2185b;
  border-radius: 8px;
  font-weight: 600;
}

.add-question-form {
  background: #2a1a20;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.add-question-form h3 {
  margin-bottom: 16px;
  color: white;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: white;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
}

.add-question-form button {
  padding: 12px 24px;
  background: #c2185b;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
}

.add-question-form button:disabled {
  background: #ccc;
  cursor: not-allowed;
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

.questions-admin-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-question-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 0;
  background: white;
  overflow: hidden;
}

.question-main-accordion {
  margin: 0;
}

.question-accordion-toggle {
  width: 100%;
  padding: 20px 24px;
  background: #f5f5f5;
  color: #333;
  border: none;
  border-bottom: 2px solid #e0e0e0;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-accordion-toggle:hover {
  background: #eeeeee;
}

.question-number {
  font-size: 16px;
  color: #333;
}

.question-content {
  padding: 24px;
}

.question-header h3 {
  color: #333;
  margin-bottom: 8px;
}

.meta {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.deadline {
  font-size: 14px;
  color: #ff9800;
  font-weight: 600;
}

.character-limit-info {
  font-size: 14px;
  color: #c2185b;
  font-weight: 600;
}

.status-enabled {
  color: #4caf50;
  font-weight: 600;
}

.status-disabled {
  color: #f44336;
  font-weight: 600;
}

.correct-answer-accordion {
  margin: 16px 0;
}

.accordion-toggle {
  width: 100%;
  padding: 12px;
  background: #2a1a20;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.accordion-toggle:hover {
  background: #3a2a30;
}

.correct-answer {
  background: #fff3e0;
  padding: 12px;
  border-radius: 8px;
  margin-top: 8px;
  border-left: 4px solid #c2185b;
  color: #333;
}

.question-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.question-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
}

.btn-toggle {
  background: #1a1a1a;
  color: white;
}

.btn-view {
  background: #c2185b;
  color: white;
}

.btn-results {
  background: #880e4f;
  color: white;
}

.btn-results:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-score {
  background: #880e4f;
  color: white;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-score:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-delete {
  background: #000000;
  color: white;
}

.responses-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #e0e0e0;
}

.responses-section h4 {
  margin-bottom: 16px;
  color: #c2185b;
}

.responses-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.response-item {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.podium-gold {
  background: linear-gradient(135deg, #fff9e6 0%, #ffd700 20%, #fff9e6 100%);
  border: 2px solid #ffd700;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
}

.podium-silver {
  background: linear-gradient(135deg, #f5f5f5 0%, #c0c0c0 20%, #f5f5f5 100%);
  border: 2px solid #c0c0c0;
  box-shadow: 0 4px 12px rgba(192, 192, 192, 0.3);
}

.podium-bronze {
  background: linear-gradient(135deg, #fff5e6 0%, #cd7f32 20%, #fff5e6 100%);
  border: 2px solid #cd7f32;
  box-shadow: 0 4px 12px rgba(205, 127, 50, 0.3);
}

.response-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.response-time {
  font-size: 12px;
  color: #666;
}

.response-answer {
  padding: 12px;
  background: white;
  border-radius: 6px;
  margin-bottom: 8px;
}

.response-score {
  margin-top: 12px;
  padding: 12px;
  background: #e8f5e9;
  border-radius: 6px;
}

.score-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-weight: 600;
  margin-bottom: 8px;
}

.score-excellent {
  background: #4caf50;
  color: white;
}

.score-good {
  background: #8bc34a;
  color: white;
}

.score-fair {
  background: #ff9800;
  color: white;
}

.score-poor {
  background: #f44336;
  color: white;
}

.feedback {
  font-size: 14px;
  color: #555;
  font-style: italic;
  margin-top: 8px;
}

.image-preview {
  margin-top: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  max-width: 400px;
  position: relative;
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
}

.remove-image-btn:hover {
  background: rgba(194, 24, 91, 0.9);
}

.upload-options {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.upload-mode-btn {
  flex: 1;
  padding: 10px;
  background: #3a2a30;
  color: white;
  border: 2px solid #3a2a30;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-mode-btn.active {
  background: #c2185b;
  border-color: #c2185b;
}

.upload-mode-btn:hover {
  opacity: 0.8;
}

.url-input input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
}

.file-input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.file-input input[type="file"] {
  display: none;
}

.file-upload-label {
  flex: 1;
  padding: 12px;
  background: #c2185b;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.3s;
  color: #333;
  font-weight: 500;
}

.file-upload-label:hover {
  border-color: #c2185b;
  background: #fff;
  color: #c2185b;
}

.upload-btn {
  padding: 12px 20px;
  background: #c2185b;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
  white-space: nowrap;
}

.upload-btn:hover {
  background: #880e4f;
}

.upload-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.question-image {
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  max-width: 600px;
}

.question-image img {
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid #e0e0e0;
}
</style>
