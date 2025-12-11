const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Configurações básicas
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
    session({
        secret: 'segredo-super-simples',
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 30 * 60 * 1000 } // 30 minutos
    })
);

// Arrays para armazenar dados em memória
let equipes = [];
let jogadores = [];

// Middleware para proteger rotas
function autenticar(req, res, next) {
    if (req.session.logado) {
        next();
    } else {
        res.redirect('/login');
    }
}

// ---------------- ROTAS INICIAIS ----------------

// Tela de login
app.get('/login', (req, res) => {
    res.send(`
        <form method="POST" action="/login">
            <h2>Login</h2>
            <input type="text" name="usuario" placeholder="Usuário" required>
            <input type="password" name="senha" placeholder="Senha" required>
            <button type="submit">Entrar</button>
        </form>
    `);
});

// Validação do login
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;

    if (usuario === 'admin' && senha === '123') {
        req.session.logado = true;

        const agora = new Date().toLocaleString('pt-BR');
        res.cookie('ultimoAcesso', agora, { maxAge: 365 * 24 * 60 * 60 * 1000 });

        res.redirect('/menu');
    } else {
        res.send('<p>Login inválido. <a href="/login">Tente novamente</a></p>');
    }
});

// Menu principal
app.get('/menu', autenticar, (req, res) => {
    const ultimo = req.cookies.ultimoAcesso || 'Primeiro acesso';

    res.send(`
        <h2>Menu do Sistema</h2>
        <p>Último acesso: ${ultimo}</p>

        <a href="/equipes/cadastrar">Cadastrar Equipe</a><br>
        <a href="/jogadores/cadastrar">Cadastrar Jogador</a><br>
        <a href="/logout">Logout</a>
    `);
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});


let ultimoIdEquipe = 1;

app.get('/equipes/cadastrar', autenticar, (req, res) => {
    res.send(`
        <h2>Cadastro de Equipe</h2>
        <form method="POST" action="/equipes/cadastrar">
            <label>Nome da equipe:</label><br>
            <input type="text" name="nomeEquipe" required><br><br>

            <label>Nome do capitão responsável:</label><br>
            <input type="text" name="capitao" required><br><br>

            <label>Telefone / WhatsApp do capitão:</label><br>
            <input type="text" name="telefone" required><br><br>

            <button type="submit">Cadastrar equipe</button>
        </form>

        <br>
        <a href="/menu">Voltar ao menu</a><br>
        <a href="/equipes">Ver equipes cadastradas</a>
    `);
});

app.post('/equipes/cadastrar', autenticar, (req, res) => {
    const { nomeEquipe, capitao, telefone } = req.body;

    if (!nomeEquipe || !capitao || !telefone ||
        nomeEquipe.trim() === '' || capitao.trim() === '' || telefone.trim() === '') {

        return res.send(`
            <p>Preencha todos os campos corretamente.</p>
            <a href="/equipes/cadastrar">Voltar ao cadastro</a>
        `);
    }

    equipes.push({
        id: ultimoIdEquipe++,
        nome: nomeEquipe.trim(),
        capitao: capitao.trim(),
        telefone: telefone.trim()
    });

    res.redirect('/equipes');
});

app.get('/equipes', autenticar, (req, res) => {
    let html = `
        <h2>Equipes cadastradas</h2>
    `;

    if (equipes.length === 0) {
        html += `<p>Nenhuma equipe cadastrada ainda.</p>`;
    } else {
        html += `<ul>`;
        equipes.forEach(equipe => {
            html += `
                <li>
                    <strong>${equipe.nome}</strong><br>
                    Capitão: ${equipe.capitao}<br>
                    Telefone: ${equipe.telefone}
                </li><br>
            `;
        });
        html += `</ul>`;
    }

    html += `
        <a href="/equipes/cadastrar">Cadastrar nova equipe</a><br>
        <a href="/menu">Voltar ao menu</a>
    `;

    res.send(html);
});


app.get('/jogadores/cadastrar', autenticar, (req, res) => {
    if (equipes.length === 0) {
        return res.send(`
            <p>Você precisa cadastrar pelo menos uma equipe antes de cadastrar jogadores.</p>
            <a href="/equipes/cadastrar">Cadastrar equipe</a><br>
            <a href="/menu">Voltar ao menu</a>
        `);
    }

    let optionsEquipes = '';
    equipes.forEach(equipe => {
        optionsEquipes += `<option value="${equipe.id}">${equipe.nome}</option>`;
    });

    res.send(`
        <h2>Cadastro de Jogador</h2>
        <form method="POST" action="/jogadores/cadastrar">
            <label>Nome do jogador:</label><br>
            <input type="text" name="nome" required><br><br>

            <label>Nickname in-game:</label><br>
            <input type="text" name="nickname" required><br><br>

            <label>Função (top, jungle, mid, atirador, suporte):</label><br>
            <select name="funcao" required>
                <option value="">Selecione...</option>
                <option value="top">Top</option>
                <option value="jungle">Jungle</option>
                <option value="mid">Mid</option>
                <option value="atirador">Atirador</option>
                <option value="suporte">Suporte</option>
            </select><br><br>

            <label>Elo (Ferro, Bronze, Prata, Ouro, Platina, etc.):</label><br>
            <input type="text" name="elo" required><br><br>

            <label>Gênero:</label><br>
            <input type="text" name="genero" required><br><br>

            <label>Equipe:</label><br>
            <select name="equipeId" required>
                ${optionsEquipes}
            </select><br><br>

            <button type="submit">Cadastrar jogador</button>
        </form>

        <br>
        <a href="/menu">Voltar ao menu</a><br>
        <a href="/jogadores">Ver jogadores cadastrados</a>
    `);
});

app.post('/jogadores/cadastrar', autenticar, (req, res) => {
    const { nome, nickname, funcao, elo, genero, equipeId } = req.body;

    // Validação no servidor
    if (!nome || !nickname || !funcao || !elo || !genero || !equipeId ||
        nome.trim() === '' || nickname.trim() === '' ||
        funcao.trim() === '' || elo.trim() === '' ||
        genero.trim() === '' || equipeId.trim() === '') {

        return res.send(`
            <p>Preencha todos os campos corretamente.</p>
            <a href="/jogadores/cadastrar">Voltar ao cadastro</a>
        `);
    }

    const idEquipe = parseInt(equipeId);

    jogadores.push({
        nome: nome.trim(),
        nickname: nickname.trim(),
        funcao: funcao.trim(),
        elo: elo.trim(),
        genero: genero.trim(),
        equipeId: idEquipe
    });

    res.redirect('/jogadores');
});

app.get('/jogadores', autenticar, (req, res) => {
    let html = `<h2>Jogadores por equipe</h2>`;

    if (jogadores.length === 0) {
        html += `<p>Nenhum jogador cadastrado ainda.</p>`;
    } else {
        equipes.forEach(equipe => {
            html += `<h3>Equipe: ${equipe.nome}</h3>`;

            const jogadoresDaEquipe = jogadores.filter(j => j.equipeId === equipe.id);

            if (jogadoresDaEquipe.length === 0) {
                html += `<p>Nenhum jogador cadastrado para esta equipe.</p>`;
            } else {
                html += `<ul>`;
                jogadoresDaEquipe.forEach(j => {
                    html += `
                        <li>
                            ${j.nome} (${j.nickname}) - ${j.funcao} - Elo: ${j.elo} - Gênero: ${j.genero}
                        </li>
                    `;
                });
                html += `</ul>`;
            }

            html += `<hr>`;
        });
    }

    html += `
        <a href="/jogadores/cadastrar">Cadastrar novo jogador</a><br>
        <a href="/menu">Voltar ao menu</a>
    `;

    res.send(html);
});


// Iniciar servidor
app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});
