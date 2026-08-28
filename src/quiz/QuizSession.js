const config = require('./config');
const hints = require('./hints');
const playerRepository = require('./database/repositories/playerRepository');

class QuizSession {
    constructor(chatId, questions, ctx) {
        this.chatId = chatId;
        this.questions = questions;
        this.ctx = ctx;

        this.currentQuestionIndex = 0;
        this.questionStartedAt = null;

        this.preparedHints = null;
        this.currentHint = 0;

        this.roundScores = new Map();

        this.inactiveQuestions = 0;
        this.wasActive = false;

        this.status = 'STARTING';

        this.timers = new Set();

        this.finished = new Promise(resolve => {
            this.resolveFinished = resolve;
        });
    }

    setStatus(status) {
        this.status = status;
    }

    async reply(text) {
        return this.ctx.reply(text, {
            parse_mode: 'HTML'
        });
    }

    normalizeAnswer(answer) {
        return answer
            .trim()
            .replace(/\s+/g, ' ')
            .toUpperCase();
    }

    createProgressBar(stage) {
        const total = config.progressBarLength;
        const stages = 4;
        const symbolsPerStage = total / stages;

        const remaining = total - (stage * symbolsPerStage);

        return `(${config.progressEmptySymbol.repeat(stage * symbolsPerStage)}${config.progressFilledSymbol.repeat(remaining)})`;
    }

    createQuestionText(question, answerMask = null, progressBar = null) {
        let text =
            `<b>${config.questionTitle} ${this.currentQuestionIndex + 1} из ${this.questions.length}</b>\n` +
            `<i>${question.text}</i>`;

        if (answerMask !== null) {
            text += `\n\n${answerMask}`;
        }

        if (progressBar !== null) {
            text += `\n\n${progressBar}`;
        }

        return text;
    }

    addTimer(timer) {
        this.timers.add(timer);
        return timer;
    }

    clearTimers() {
        for (const timer of this.timers) {
            clearTimeout(timer);
        }

        this.timers.clear();
    }

    async start() {
        this.setStatus('ACTIVE');

        await this.reply(
            `${config.title}\n\n` +
            `${config.quizInfo}`
        );

        await new Promise(resolve => {
            const timer = setTimeout(resolve, config.introDelay * 1000);
            this.addTimer(timer);
        });

        if (this.status !== 'ACTIVE') {
            return;
        }

        await this.reply(config.roundStarted);

        await new Promise(resolve => {
            const timer = setTimeout(resolve, config.roundStartDelay * 1000);
            this.addTimer(timer);
        });

        if (this.status !== 'ACTIVE') {
            return;
        }

        await this.startQuestion();
    }

    async startQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        this.wasActive = false;

        if (!question) {
            return;
        }

        this.setStatus('ANSWERING');
        this.questionStartedAt = Date.now();

        this.preparedHints = hints.prepare(
            question.correctAnswer
        );

        this.currentHint = 0;
        const progressBar = this.createProgressBar(0);

        const text = this.createQuestionText(
            question,
            null,
            progressBar
        );

        await this.reply(text);

        const timer = setTimeout(() => {
            this.showHint(1);
        }, config.hint1 * 1000);

        this.addTimer(timer);
    }

    async showHint(hintNumber) {
        if (this.status !== 'ANSWERING') {
            return;
        }

        if (!this.preparedHints) {
            return;
        }

        const hint = this.preparedHints[`hint${hintNumber}`];

        if (!hint) {
            return;
        }

        this.currentHint = hintNumber;

        const progressBar = this.createProgressBar(hintNumber);

        const question = this.questions[this.currentQuestionIndex];

        const text = this.createQuestionText(
            question,
            hint.mask,
            progressBar
        );

        await this.reply(text);

        if (this.status !== 'ANSWERING') {
            return;
        }

        if (hintNumber === 1) {
            const timer = setTimeout(() => {
                this.showHint(2);
            }, (config.hint2 - config.hint1) * 1000);

            this.addTimer(timer);
            return;
        }

        if (hintNumber === 2) {
            const timer = setTimeout(() => {
                this.showHint(3);
            }, (config.hint3 - config.hint2) * 1000);

            this.addTimer(timer);
            return;
        }

        if (hintNumber === 3) {
            const timer = setTimeout(() => {
                this.finishQuestion();
            }, (config.timeout - config.hint3) * 1000);

            this.addTimer(timer);
        }
    }

    async handleMessage(ctx) {

        if (this.status !== 'ANSWERING') {
            return;
        }

        if (!ctx.message || !ctx.message.text) {
            return;
        }
        
        this.wasActive = true;

        const question = this.questions[this.currentQuestionIndex];

        if (!question) {
            return;
        }

        const userAnswer = this.normalizeAnswer(ctx.message.text);
        const correctAnswer = this.normalizeAnswer(question.correctAnswer);

        if (userAnswer !== correctAnswer) {
            return;
        }

        this.clearTimers();

        await this.handleCorrectAnswer(ctx);
    }

    async handleCorrectAnswer(ctx) {
        const answeredAt = Date.now();

        const elapsedSeconds =
            (answeredAt - this.questionStartedAt) / 1000;

        const points = this.currentHint === 0
            ? config.points.full
            : config.points[`hint${this.currentHint}`];
        
            const userId = ctx.from.id;

        const currentScore = this.roundScores.get(userId) || {
            userId,
            firstName: ctx.from.first_name || '',
            lastName: ctx.from.last_name || '',
            points: 0,
            correctAnswers: 0
        };

        currentScore.points += points;
        currentScore.correctAnswers += 1;
        currentScore.answeredAt = answeredAt;
        currentScore.elapsedSeconds = elapsedSeconds;

        this.roundScores.set(userId, currentScore);

        await playerRepository.addPoints(
            userId,
            currentScore.firstName,
            currentScore.lastName,
            points
        );

        this.inactiveQuestions = 0;
        this.preparedHints = null;
        this.currentHint = 0;

        await ctx.reply(
            `${config.correctAnswer}\n` +
            `${config.correctAnswerBy} ${currentScore.firstName} ${currentScore.lastName}\n` +
            `+${points}`
        );

        this.setStatus('PAUSE');

        await this.showNextQuestion();
    }

    async showNextQuestion() {
        await new Promise(resolve => {
            const timer = setTimeout(
                resolve,
                config.nextQuestionDelay * 1000
            );

            this.addTimer(timer);
        });

        if (this.status !== 'PAUSE') {
            return;
        }

        if (this.currentQuestionIndex >= this.questions.length - 1) {
            await this.finishRound();
            return;
        }

        await this.ctx.reply(config.nextQuestion);

        await this.startNextQuestion();
    }

    async startNextQuestion() {
        await new Promise(resolve => {
            const timer = setTimeout(
                resolve,
                config.pauseBetweenQuestions * 1000
            );

            this.addTimer(timer);
        });

        if (this.status !== 'PAUSE') {
            return;
        }

        this.currentQuestionIndex++;

        await this.startQuestion();
    }

    async finishQuestion() {
        if (this.status !== 'ANSWERING') {
            return;
        }

        this.setStatus('PAUSE');
        
        this.clearTimers();

        if (this.wasActive) {
            this.inactiveQuestions = 0;
        } else {
            this.inactiveQuestions++;
        }

        const question = this.questions[this.currentQuestionIndex];

        await this.ctx.reply(
            `${config.noCorrectAnswer}\n` +
            `${config.correctAnswerText} ${question.correctAnswer}`
        );

        if (this.inactiveQuestions >= 3) {
            await this.ctx.reply(config.quizStoppedByInactivity);
            await this.finishRound();
            return;
        }

        this.preparedHints = null;
        this.currentHint = 0;

        console.log(
            `Question ${this.currentQuestionIndex + 1} completed`
        );

        await this.showNextQuestion();
    }

    async finishRound() {
        this.setStatus('FINISHED');
        this.clearTimers();
        
        const results = [...this.roundScores.values()]
            .sort((a, b) => b.points - a.points);

        if (results.length === 0) {
            await this.ctx.reply(config.emptyRoundResult);
            this.stop();
            return;
        }


        let text = '🏆 Результаты раунда\n\n';

        results.forEach((player, index) => {
            const name = `${player.firstName} ${player.lastName}`.trim();

            text += `${index + 1}. ${name} — ${player.points} баллов\n`;
        });

        await this.ctx.reply(text);

        const topPlayers = await playerRepository.getTop(10);

        let ratingText = '🌍 Глобальный рейтинг\n\n';

        topPlayers.forEach((player, index) => {
            const name = `${player.firstName} ${player.lastName}`.trim();

            ratingText += `${index + 1}. ${name} — ${player.points} баллов\n`;
        });

        await this.ctx.reply(ratingText);

        this.stop();
    }

    stop() {
        this.setStatus('STOPPING');

        this.clearTimers();

        this.setStatus('FINISHED');

        this.resolveFinished();
        
        console.log(`Quiz stopped in chat ${this.chatId}`);
    }
}

module.exports = QuizSession;