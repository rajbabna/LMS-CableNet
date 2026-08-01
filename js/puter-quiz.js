// ===========================================================
// js/puter-quiz.js
// Embeds the Puter-hosted flashcard quiz on the landing page
// (Step 13 satellite tool). Reads window.PUTER_QUIZ_URL from
// config.js. When unset, the section shows a "coming soon"
// placeholder so the page still renders cleanly.
// ===========================================================

(function () {
  const quizUrl = window.PUTER_QUIZ_URL || '';

  const embed = document.getElementById('puterQuizEmbed');
  const link = document.getElementById('puterQuizFullscreen');
  const fallback = document.getElementById('puterQuizFallback');

  if (quizUrl) {
    if (embed) {
      embed.src = quizUrl;
      embed.style.display = 'block';
    }
    if (link) {
      link.href = quizUrl;
      link.style.display = 'inline-block';
    }
    if (fallback) fallback.style.display = 'none';
  } else {
    if (fallback) fallback.style.display = 'block';
    if (embed) embed.style.display = 'none';
    if (link) link.style.display = 'none';
  }
})();
