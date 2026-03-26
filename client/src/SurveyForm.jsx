import { useMemo, useState } from 'react';

const sections = [
  {
    id: 1,
    title: 'Daily Life Pattern',
    questions: [
      {
        id: 'Q1',
        key: 'sleepTime',
        label: 'How many hours do you sleep on average?',
        options: ['Less than 5 hours', '5–6 hours', '6–7 hours', '7–8 hours', 'More than 8 hours', 'Sleep is a myth 😴']
      },
      {
        id: 'Q2',
        key: 'studyHours',
        label: 'Study hours/day',
        options: ['0–1 hrs', '1–3 hrs', '3–5 hrs', '5+ hrs', 'Define study']
      },
      {
        id: 'Q3',
        key: 'socialTime',
        label: 'Social time/day',
        options: ['Less than 1hr', '1–3 hrs', '3–5 hrs', 'I live in the common room']
      },
      {
        id: 'Q4',
        key: 'stressLevel',
        label: 'Stress level',
        options: [1, 2, 3, 4, 5]
      },
      {
        id: 'Q5',
        key: 'primaryGoal',
        label: 'Primary goal',
        options: ['Money', 'Peace', 'Success', 'Just survive this semester']
      }
    ]
  },
  {
    id: 2,
    title: 'Academic Reality Check',
    questions: [
      {
        id: 'Q6',
        key: 'attendance',
        label: 'Lecture attendance',
        options: ['75%+ (Sincere hai bhai)', '50–75%', '25–50%', 'What are lectures?']
      },
      {
        id: 'Q7',
        key: 'examPrepTiming',
        label: 'Exam prep timing',
        options: ['1 month before', '1 week before', '1 night before', 'During the exam']
      },
      {
        id: 'Q8',
        key: 'kalSePadhunga',
        label: "Times said 'kal se padhunga' this week",
        options: ['0 (Liar)', '1–3', '4–7', 'Lost count']
      },
      {
        id: 'Q9',
        key: 'marksExpectation',
        label: 'Internal marks (expectation vs reality)',
        options: ['Got what I expected', 'Got less', 'Got more', "I don't check marks"]
      },
      {
        id: 'Q10',
        key: 'examSleep',
        label: 'Sleep before exam',
        options: ['Full 8 hrs', '4–5 hrs', '2 hrs', 'What is sleep']
      }
    ]
  },
  {
    id: 3,
    title: 'Personality Signals',
    questions: [
      {
        id: 'Q11',
        key: 'submissionBehavior',
        label: '2am before submission, you are:',
        options: ['Done since yesterday', 'Starting now', 'Googling for extensions', 'Submitting whatever exists']
      },
      {
        id: 'Q12',
        key: 'screenTime',
        label: 'Phone screen time/day',
        options: ['Under 2 hrs', '2–4 hrs', '4–6 hrs', '6+ hrs']
      },
      {
        id: 'Q13',
        key: 'motivationFrequency',
        label: 'How often genuinely motivated',
        options: ['Daily', 'Weekly', 'Rarely', 'Motivation left the chat']
      }
    ]
  }
];

const allQuestions = sections.flatMap((section) =>
  section.questions.map((question) => ({ ...question, sectionId: section.id, sectionTitle: section.title }))
);

const SurveyForm = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    if (typeof window === 'undefined') {
      return { displayName: '' };
    }

    return {
      displayName: localStorage.getItem('student-dna-display-name') || ''
    };
  });
  const [showValidationWarning, setShowValidationWarning] = useState(false);

  const currentQuestion = allQuestions[currentIndex];
  const selectedValue = answers[currentQuestion.key];
  const progressPercent = Math.round(((currentIndex + 1) / allQuestions.length) * 100);

  const sectionProgress = useMemo(() => {
    const currentSection = sections.find((section) => section.id === currentQuestion.sectionId);
    return {
      currentSectionId: currentSection.id,
      totalSections: sections.length,
      sectionTitle: currentSection.title
    };
  }, [currentQuestion]);

  const handleSelect = (value) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }));
    setShowValidationWarning(false);
  };

  const handleDisplayNameChange = (event) => {
    setAnswers((prev) => ({ ...prev, displayName: event.target.value }));
  };

  const goNext = () => {
    if (selectedValue === undefined) {
      setShowValidationWarning(true);
      return;
    }

    if (currentIndex === allQuestions.length - 1) {
      onComplete(answers);
      return;
    }
    setShowValidationWarning(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowValidationWarning(false);
    }
  };

  return (
    <section className="survey-shell fade-up" key={currentQuestion.id}>
      <div className="display-name-wrap">
        <label className="display-name-label" htmlFor="displayName">
          DISPLAY NAME (OPTIONAL)
        </label>
        <input
          id="displayName"
          type="text"
          className="display-name-input"
          value={answers.displayName || ''}
          onChange={handleDisplayNameChange}
          placeholder="Enter your name"
          maxLength={40}
        />
      </div>

      <div className="progress-wrap">
        <div className="progress-meta-row">
          <span>
            SECTION {sectionProgress.currentSectionId} OF {sectionProgress.totalSections}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="section-dots">
          {sections.map((section) => {
            let dotState = 'inactive';
            if (section.id < sectionProgress.currentSectionId) {
              dotState = 'done';
            } else if (section.id === sectionProgress.currentSectionId) {
              dotState = 'active';
            }
            return <span key={section.id} className={`section-dot ${dotState}`} />;
          })}
        </div>
      </div>

      <div className="section-header-row">
        <span className="section-tag">
          {String(sectionProgress.currentSectionId).padStart(2, '0')} / {String(sectionProgress.totalSections).padStart(2, '0')}
        </span>
        <span className="section-name">{sectionProgress.sectionTitle}</span>
      </div>

      <article className="question-card question-transition" style={{ animationDelay: '0.05s' }}>
        <div className="question-label-row">
          <span className="question-badge">{currentQuestion.id}</span>
          <p className="question-text">{currentQuestion.label}</p>
        </div>

        {currentQuestion.key === 'stressLevel' ? (
          <div>
            <div className="scale-row">
              {currentQuestion.options.map((option) => {
                const isActive = selectedValue === option;
                return (
                  <button
                    type="button"
                    key={String(option)}
                    className={`scale-btn ${isActive ? 'selected' : ''}`}
                    onClick={() => handleSelect(option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <div className="scale-labels">
              <span>😌 No stress</span>
              <span>💀 Send help</span>
            </div>
          </div>
        ) : (
          <div>
            {currentQuestion.options.map((option) => {
              const isActive = selectedValue === option;
              return (
                <button
                  type="button"
                  className={`option ${isActive ? 'selected' : ''}`}
                  onClick={() => handleSelect(option)}
                  key={String(option)}
                >
                  <span className={`option-radio ${isActive ? 'selected' : ''}`} />
                  <span className="option-text">{option}</span>
                </button>
              );
            })}
          </div>
        )}
      </article>

      {showValidationWarning && (
        <p className="selection-warning">Please select one option before continuing.</p>
      )}

      <div className="nav-row">
        <button type="button" className="nav-btn back-btn" onClick={goBack} disabled={currentIndex === 0}>
          BACK
        </button>

        <button
          type="button"
          className={`nav-btn ${currentIndex === allQuestions.length - 1 ? 'submit-btn' : 'next-btn'}`}
          onClick={goNext}
        >
          {currentIndex === allQuestions.length - 1 ? 'GENERATE DNA REPORT' : 'NEXT QUESTION'}
        </button>
      </div>
    </section>
  );
};

export default SurveyForm;
