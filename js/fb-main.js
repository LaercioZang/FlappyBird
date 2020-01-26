// ----------------- VARIÁVEIS -----------------    

// Depuração
var debugmode = false;

// Estados do jogo
var states = Object.freeze({
    SplashScreen: 0,
    GameScreen: 1,
    ScoreScreen: 2
});

// Variáveis de lógica
var currentscore;
var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6;

// Pontuação
var score = 0;
var highscore = 0;

// Cano
var pipeheight = 90;
var pipewidth = 52;
var pipes = new Array();

// Replay
var replayclickable = false;

// Sons
var volume = 30;
var soundJump = new buzz.sound("assets/sounds/sfx_wing.ogg");
var soundScore = new buzz.sound("assets/sounds/sfx_point.ogg");
var soundHit = new buzz.sound("assets/sounds/sfx_hit.ogg");
var soundDie = new buzz.sound("assets/sounds/sfx_die.ogg");
var soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.ogg");
buzz.all().setVolume(volume);

// Loop
var loopGameloop;
var loopPipeloop;

// ----------------- FUNÇÕES -----------------
$(document).ready(function() {
    if (window.location.search == "?debug")
        deugmode = true;
    if (window.location.search == "?easy")
        pipeheight = 200;

    var savedscore = getCookie("highscore");
    if (savedscore !== "")
        highscore = parseInt(savedscore);

    showSplash();
});

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length)
    }
    return "";
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000))
    var expires = "expires" + d.toGMTString();
    document.cookie = cname + "=" + cvalue + ";" + expires;
}

function showSplash() {
    // Estado atual do jogo
    currentstate = states.SplashScreen;

    // Valores iniciais
    velocity = 0;
    position = 180;
    rotation = 0;
    score = 0;

    // Resetar as posções do jogador
    $("#player").css({ y: 0, x: 0 });
    updatePlayer($("#player"));

    soundSwoosh.stop();
    soundSwoosh.play();

    // Limpar os canos
    $(".pipe").remove();
    pipes = new Array();

    // Começar as animações novamente
    $(".animated").css('animation-play-state', 'running');
    $(".animated").css('-webkit-animation-play-state', 'running');

    // Splash Screen aparecer
    $("#splash").transition({ opacity: 1 }, 2000, 'ease');
}

// Start

function startGame() {
    // Estado do jogo
    currentstate = states.GameScreen;

    // Splash screen sumir
    $("#splash").stop();
    $("#splash").transition({ opacity: 0 }, 500, 'ease');

    // Mostrar o score
    setBigScore();

    // Debug
    if (debugmode) {
        $(".boundingbox").show();
    }

    // Começar os loops do jogo
    var updaterate = 1000.0 / 60.0; // 60 fps
    loopGameloop = setInterval(gameloop, updaterate);
    loopPipeloop = setInterval(updatePipes, 1400);

    // Pular para começar o jogo
    playerJump();
}

function updatePlayer(player) {
    // Rotação
    rotation = Math.min((velocity / 10) * 90, 90);

    // Aplicando a rotação no CSS
    $(player).css({ rotate: rotation, top: position });
}

function gameloop() {
    var player = $("#player");

    // Upar a posição e velocidade do player 
    velocity += gravity;
    position += velocity;

    // Aplicar os novos valores do player
    updatePlayer(player);

    // Criar o hack de bouding box para o player
    var box = document.getElementById('player').getBoundingClientRect();
    var origwidth = 34.0;
    var origheight = 24.0;

    var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
    var boxheight = (origheight + box.height) / 2;
    var boxleft = ((box.width - boxwidth) / 2) + box.left;
    var boxtop = ((box.height - boxheight) / 2) + box.top;
    var boxright = boxleft + boxwidth;
    var boxbottom = boxtop + boxheight;

    // Se acertar o footer, o player morre e retorna o jogo
    if (box.bottom >= $("#footer-game").offset().top) {
        playerDead();
        return;
    }

    // Se tentar passar pelo topo, zera a posição dele no topo
    var ceiling = $("#ceiling");
    if (boxtop <= (ceiling.offset().top + ceiling.height()))
        position = 0;

    // Se não houver nenhum cano no jogo retorna
    if (pipes[0] == null)
        return;

    // Determina a área para os próximos canos
    var nextpipe = pipes[0];
    var nextpipeupper = nextpipe.children(".pipe_upper");

    var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
    var pipeleft = nextpipeupper.offset().left - 2; // Por algum motivo ele começa no deslocamento dos tubos internos , e não os tubos exteriores 
    var piperight = pipeleft + pipewidth;
    var pipebottom = pipetop + pipeheight;

    // O que acontece se cair dentro do tubo
    if (boxright > pipeleft) {
        // Estamos dentro dos tubos, já passamos pelo tubo superior e inferior?
        if (boxtop > pipetop && boxbottom < pipebottom) {
            // sim, estamos dentro dos limites!

        } else {
            // não podemos pular estando dentro do cano, você morreu! return game!
            playerDead();
            return;
        }
    }


    // Já passamos o cano?
    if (boxleft > piperight) {
        // se sim, remove e aparece outro
        pipes.splice(0, 1);

        // pontua a partir do momento que vai passando
        playerScore();
    }

}

$(document).keydown(function(e) {
    //Pulo na barra de espaco
    if (e.keyCode == 32) {
        if (currentstate == states.ScoreScreen)
            $("#replay").click();
        else
            screenClick();
    }
});

// inicia o jogo ao clicar na tela ou no espaco
if ("ontouchstart" in window)
    $(document).on("touchstart", screenClick);
else
    $(document).on("mousedown", screenClick);

function screenClick() {
    if (currentstate == states.GameScreen)
        playerJump();
    else if (currentstate == states.SplashScreen)
        startGame();
}

// funcao de pulo com som
function playerJump() {
    velocity = jump;
    soundJump.stop();
    soundJump.play();

}

function setBigScore(erase) {
    var elemscore = $("#bigscore")
    elemscore.empty();

    if (erase)
        return;

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setSmallScore() {

    var elemscore = $("#currentscore")
    elemscore.empty();

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setHighScore() {

    var elemscore = $("#highscore")
    elemscore.empty();

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setMedal() {
    var elemmedal = $("#medal");
    elemmedal.empty();

    if (score < 10)
        return;

    if (score >= 10)
        medal = "bronze";
    if (score >= 20)
        medal = "silver";
    if (score >= 30)
        medal = "gold";
    if (score >= 40)
        medal = "platinum";

    elemmedal.append('<img src="assets/medal_' + medal + '.png" alt="' + medal + '">');

    return true;
}

function playerDead() {
    $(".animated").css("animation-play-state", 'paused');
    $(".animated").css("-webkit-animation-play-state", 'paused');

    var playerbottom = $("#player").position().top + $("#player").width();
    var floor = $("#flyarea-game").height();
    var movey = Math.max(0, floor - playerbottom);
    $("#player").transition({ y: movey + 'px', rotate: 90 }, 1000, 'easeInOutCubic');

    currentstate = states.ScoreScreen;

    clearInterval(loopGameloop);
    clearInterval(loopPipeloop);
    loopGameloop = null;
    loopPipeloop = null;

    if (isIncompatible.any()) {
        showScore();
    } else {
        soundHit.play().bindOnce("ended", function() {
            soundDie.play().bindOnce("ended", function() {
                showScore();
            });
        });
    }

}


function showScore() {
    $("#scoreboard").css("display", "block");

    setBigScore(true);

    if (score > highscore) {
        highscore = score;
        setCookie("hightscore", highscore, 999);

    }

    setSmallScore();
    setHighScore();
    var wonmedal = setMedal();

    soundSwoosh.stop();
    soundSwoosh.play();


    $("#scoreboard").css({ y: '40px', opacity: 0 });
    $("#replay").css({ y: '40px', opacity: 0 });
    $("#scoreboard").transition({ y: '0px', opacity: 1 }, 600, 'ease', function() {
        soundSwoosh.stop();
        soundSwoosh.play();
        $("#replay").transition({ y: '0px', opacity: 1 }, 600, 'ease');

        if (wonmedal) {
            $("#medal").css({ scale: 2, opacity: 0 });
            $("#medal").transition({ scale: 1, opacity: 1 }, 1200, 'ease');
        }


    });

    replayclickable = true;


}

$("#replay").click(function() {

    if (!replayclickable)
        return;
    else
        replayclickable = false;

    soundSwoosh.stop();
    soundSwoosh.play();

    $("#scoreboard").transition({ y: '-40px', opacity: 1 }, 1000, 'ease', function() {
        $("#scoreboard").css("display", "none");

        showSplash();
    });
});

function playerScore() {

    score += 1;
    soundScore.stop();
    soundScore.play();
    setBigScore();
};

function updatePipes() {
    $(".pipe").filter(function() { return $(this).position().left <= -100; }).remove();

    var padding = 80;
    var constraint = 420 - pipeheight - (padding * 2);
    var topheight = Math.floor((Math.random() * constraint) + padding);
    var bottomheight = (420 - pipeheight) - topheight;
    var newpipe = $('<div class="pipe animated"><div class="pipe_upper" style="height: ' + topheight + 'px;"></div><div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div></div>');
    $("#flyarea-game").append(newpipe);
    pipes.push(newpipe);
}

var isIncompatible = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Safari: function() {
        return (navigator.userAgent.match(/OS X.*Safari/) && !navigator.userAgent.match(/Chrome/));
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
    }
};