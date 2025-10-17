;; title: tic-tac-toe

;; The Game iD to use for the next game
;; The Game ID to use for the next game, each game has it's own iD

(define-constant THIS_CONTRACT (as-contract tx-sender)) ;; The address of this contract itself
(define-constant ERR_MIN_BET_AMOUNT u100) ;; Error thrown when a player tries to create a game with a bet amount less than the minimum (0.0001 STX)
(define-constant ERR_INVALID_MOVE u101) ;; Error thrown when a move is invalid, i.e. not within range of the board or not an X or an O
(define-constant ERR_GAME_NOT_FOUND u102) ;; Error thrown when a game cannot be found given a Game ID, i.e. invalid Game ID
(define-constant ERR_GAME_CANNOT_BE_JOINED u103) ;; Error thrown when a game cannot be joined, usually because it already has two players
(define-constant ERR_NOT_YOUR_TURN u104) ;; Error thrown when a player tries to make a move when it is not their turn
(define-constant ERR_TIMEOUT_NOT_REACHED u105) ;; Error thrown when trying to cancel a game before timeout
(define-constant ERR_NOT_OPPONENT u106) ;; Error thrown when someone other than the opponent tries to cancel
(define-constant ERR_ALREADY_IN_QUEUE u107) ;; Error thrown when player tries to join queue while already in queue
(define-constant ERR_NOT_IN_QUEUE u108) ;; Error thrown when player tries to leave queue while not in queue
(define-constant ERR_NO_OPPONENT_FOUND u109) ;; Error thrown when matchmaking cannot find suitable opponent
(define-constant ERR_GAME_NOT_DRAWN u110) ;; Error thrown when trying to quit/rematch a non-drawn game
(define-constant ERR_NOT_PLAYER u111) ;; Error thrown when non-player tries to rematch/quit
(define-constant GAME_TIMEOUT_BLOCKS u300) ;; Timeout period: ~5 minutes (assuming 1 block per second)
(define-constant DEFAULT_RATING u1200) ;; Default ELO rating for new players
(define-constant RATING_K_FACTOR u32) ;; ELO K-factor for rating adjustments

(define-data-var latest-game-id uint u0)

(define-map games 
    uint ;; Key (Game iD)
    { ;; Value (Game Tuple)
        player-one: principal,
        player-two: (optional principal),
        is-player-one-turn: bool,

        bet-amount: uint,
        board: (list 9 uint),
        
        winner: (optional principal),
        is-draw: bool, ;; Track if game ended in a draw
        draw-resolved: bool, ;; Track if players have claimed draw stakes
        last-move-block: uint ;; Block height when the last move was made
    }
)

;; Player statistics and ranking system
(define-map player-stats
    principal ;; Player address
    {
        wins: uint,
        losses: uint,
        draws: uint,
        rating: uint,
        games-played: uint,
        last-game-block: uint
    }
)

;; Matchmaking queue - stores players waiting for a match
(define-map queue-players
    principal ;; Player address
    {
        bet-amount: uint,
        join-time: uint,
        rating: uint
    }
)

;; Queue order list - maintains order of players in queue
(define-data-var queue-list (list 50 principal) (list))
(define-data-var queue-size uint u0)

(define-private (validate-move (board (list 9 uint)) (move-index uint) (move uint))
    (let (
        ;; Validate that the move is being played within range of the board
        (index-in-range (and (>= move-index u0) (< move-index u9)))

        ;; Validate that the move is either an X or an O
        (x-or-o (or (is-eq move u1) (is-eq move u2)))

        ;; Validate that the cell the move is being played on is currently empty
        (empty-spot (is-eq (unwrap! (element-at? board move-index) false) u0))
    )

    ;; All three conditions must be true for the move to be valid
    (and (is-eq index-in-range true) (is-eq x-or-o true) empty-spot)
))

(define-public (create-game (bet-amount uint) (move-index uint) (move uint))
    (let (
        ;; Get the Game ID to use for creation of this new game
        (game-id (var-get latest-game-id))
        ;; The initial starting board for the game with all cells empty
        (starting-board (list u0 u0 u0 u0 u0 u0 u0 u0 u0))
        ;; Updated board with the starting move played by the game creator (X)
        (game-board (unwrap! (replace-at? starting-board move-index move) (err ERR_INVALID_MOVE)))
        ;; Create the game data tuple (player one address, bet amount, game board, and mark next turn to be player two's turn)
        (game-data {
            player-one: contract-caller,
            player-two: none,
            is-player-one-turn: false,
            bet-amount: bet-amount,
            board: game-board,
            winner: none,
            is-draw: false,
            draw-resolved: false,
            last-move-block: stacks-block-height
        })
    )

    ;; Ensure that user has put up a bet amount greater than the minimum
    (asserts! (> bet-amount u0) (err ERR_MIN_BET_AMOUNT))
    ;; Ensure that the move being played is an `X`, not an `O`
    (asserts! (is-eq move u1) (err ERR_INVALID_MOVE))
    ;; Ensure that the move meets validity requirements
    (asserts! (validate-move starting-board move-index move) (err ERR_INVALID_MOVE))

    ;; Transfer the bet amount STX from user to this contract
    (try! (stx-transfer? bet-amount contract-caller THIS_CONTRACT))
    ;; Update the games map with the new game data
    (map-set games game-id game-data)
    ;; Increment the Game ID counter
    (var-set latest-game-id (+ game-id u1))

    ;; Log the creation of the new game
    (print { action: "create-game", data: game-data})
    ;; Return the Game ID of the new game
    (ok game-id)
))

(define-public (join-game (game-id uint) (move-index uint) (move uint))
    (let (
        ;; Load the game data for the game being joined, throw an error if Game ID is invalid
        (original-game-data (unwrap! (map-get? games game-id) (err ERR_GAME_NOT_FOUND)))
        ;; Get the original board from the game data
        (original-board (get board original-game-data))

        ;; Update the game board by placing the player's move at the specified index
        (game-board (unwrap! (replace-at? original-board move-index move) (err ERR_INVALID_MOVE)))
        ;; Update the copy of the game data with the updated board and marking the next turn to be player two's turn
        (game-data (merge original-game-data {
            board: game-board,
            player-two: (some contract-caller),
            is-player-one-turn: true,
            last-move-block: stacks-block-height
        }))
    )

    ;; Ensure that the game being joined is able to be joined
    ;; i.e. player-two is currently empty
    (asserts! (is-none (get player-two original-game-data)) (err ERR_GAME_CANNOT_BE_JOINED)) 
    ;; Ensure that the move being played is an `O`, not an `X`
    (asserts! (is-eq move u2) (err ERR_INVALID_MOVE))
    ;; Ensure that the move meets validity requirements
    (asserts! (validate-move original-board move-index move) (err ERR_INVALID_MOVE))

    ;; Transfer the bet amount STX from user to this contract
    (try! (stx-transfer? (get bet-amount original-game-data) contract-caller THIS_CONTRACT))
    ;; Update the games map with the new game data
    (map-set games game-id game-data)

    ;; Log the joining of the game
    (print { action: "join-game", data: game-data})
    ;; Return the Game ID of the game
    (ok game-id)
))

;; Given a board and three cells to look at on the board
;; Return true if all three are not empty and are the same value (all X or all O)
;; Return false if any of the three is empty or a different value
(define-private (is-line (board (list 9 uint)) (a uint) (b uint) (c uint)) 
    (let (
        ;; Value of cell at index a
        (a-val (unwrap! (element-at? board a) false))
        ;; Value of cell at index b
        (b-val (unwrap! (element-at? board b) false))
        ;; Value of cell at index c
        (c-val (unwrap! (element-at? board c) false))
    )

    ;; a-val must equal b-val and must also equal c-val while not being empty (non-zero)
    (and (is-eq a-val b-val) (is-eq a-val c-val) (not (is-eq a-val u0)))
))


;; Given a board, return true if any possible three-in-a-row line has been completed
(define-private (has-won (board (list 9 uint))) 
    (or
        (is-line board u0 u1 u2) ;; Row 1
        (is-line board u3 u4 u5) ;; Row 2
        (is-line board u6 u7 u8) ;; Row 3
        (is-line board u0 u3 u6) ;; Column 1
        (is-line board u1 u4 u7) ;; Column 2
        (is-line board u2 u5 u8) ;; Column 3
        (is-line board u0 u4 u8) ;; Left to Right Diagonal
        (is-line board u2 u4 u6) ;; Right to Left Diagonal
    )
)


(define-public (play (game-id uint) (move-index uint) (move uint))
    (let (
        ;; Load the game data for the game being joined, throw an error if Game ID is invalid
        (original-game-data (unwrap! (map-get? games game-id) (err ERR_GAME_NOT_FOUND)))
        ;; Get the original board from the game data
        (original-board (get board original-game-data))

        ;; Is it player one's turn?
        (is-player-one-turn (get is-player-one-turn original-game-data))
        ;; Get the player whose turn it currently is based on the is-player-one-turn flag
        (player-turn (if is-player-one-turn (get player-one original-game-data) (unwrap! (get player-two original-game-data) (err ERR_GAME_NOT_FOUND))))
        ;; Get the expected move based on whose turn it is (X or O?)
        (expected-move (if is-player-one-turn u1 u2))

        ;; Update the game board by placing the player's move at the specified index
        (game-board (unwrap! (replace-at? original-board move-index move) (err ERR_INVALID_MOVE)))
        ;; Check if the game has been won now with this modified board
        (is-now-winner (has-won game-board))
        ;; Merge the game data with the updated board and marking the next turn to be player two's turn
        ;; Also mark the winner if the game has been won
        (game-data (merge original-game-data {
            board: game-board,
            is-player-one-turn: (not is-player-one-turn),
            winner: (if is-now-winner (some player-turn) none),
            last-move-block: stacks-block-height
        }))
    )

    ;; Ensure that the function is being called by the player whose turn it is
    (asserts! (is-eq player-turn contract-caller) (err ERR_NOT_YOUR_TURN))
    ;; Ensure that the move being played is the correct move based on the current turn (X or O)
    (asserts! (is-eq move expected-move) (err ERR_INVALID_MOVE))
    ;; Ensure that the move meets validity requirements
    (asserts! (validate-move original-board move-index move) (err ERR_INVALID_MOVE))

    ;; if the game has been won, transfer the (bet amount * 2 = both players bets) STX to the winner
    (if is-now-winner (try! (as-contract (stx-transfer? (* u2 (get bet-amount game-data)) tx-sender player-turn))) false)

    ;; Update the games map with the new game data
    (map-set games game-id game-data)

    ;; Log the action of a move being made
    (print {action: "play", data: game-data})
    ;; Return the Game ID of the game
    (ok game-id)
))

;; Function to cancel a game due to timeout and return funds to the waiting player
(define-public (cancel-game-timeout (game-id uint))
    (let (
        ;; Load the game data for the game being cancelled, throw an error if Game ID is invalid
        (game-data (unwrap! (map-get? games game-id) (err ERR_GAME_NOT_FOUND)))
        ;; Get the current player whose turn it is
        (is-player-one-turn (get is-player-one-turn game-data))
        ;; Get player one and player two addresses
        (player-one (get player-one game-data))
        (player-two (unwrap! (get player-two game-data) (err ERR_GAME_NOT_FOUND)))
        ;; Determine the waiting player (the one who should receive the funds)
        (waiting-player (if is-player-one-turn player-two player-one))
        ;; Get the bet amount
        (bet-amount (get bet-amount game-data))
        ;; Get the last move block
        (last-move-block (get last-move-block game-data))
        ;; Calculate if timeout has been reached
        (blocks-since-last-move (- stacks-block-height last-move-block))
        ;; Mark the game as cancelled by setting the waiting player as winner
        (cancelled-game-data (merge game-data {
            winner: (some waiting-player),
            is-draw: false,
            draw-resolved: false
        }))
    )

    ;; Ensure the game hasn't already been won
    (asserts! (is-none (get winner game-data)) (err ERR_GAME_NOT_FOUND))
    ;; Ensure the game has two players (can't timeout a game that hasn't been joined)
    (asserts! (is-some (get player-two game-data)) (err ERR_GAME_NOT_FOUND))
    ;; Ensure enough time has passed since the last move
    (asserts! (>= blocks-since-last-move GAME_TIMEOUT_BLOCKS) (err ERR_TIMEOUT_NOT_REACHED))
    ;; Ensure the caller is the waiting player (the one who should receive funds)
    (asserts! (is-eq contract-caller waiting-player) (err ERR_NOT_OPPONENT))

    ;; Transfer all funds (both players' bets) to the waiting player
    (try! (as-contract (stx-transfer? (* u2 bet-amount) tx-sender waiting-player)))

    ;; Update the game with the winner
    (map-set games game-id cancelled-game-data)

    ;; Log the cancellation
    (print { action: "cancel-timeout", data: cancelled-game-data, waiting-player: waiting-player })
    
    ;; Return the game ID
    (ok game-id)
))

;; Initialize player stats if they don't exist
(define-private (init-player-stats (player principal))
    (match (map-get? player-stats player)
        stats stats ;; Player already has stats, return them
        ;; Player doesn't have stats, create new ones
        {
            wins: u0,
            losses: u0,
            draws: u0,
            rating: DEFAULT_RATING,
            games-played: u0,
            last-game-block: stacks-block-height
        }
    )
)

;; Calculate ELO rating change
(define-private (calculate-rating-change (winner-rating uint) (loser-rating uint))
    (let (
        ;; Expected score for winner (probability of winning)
        (expected-winner (/ u100000 (+ u100000 (pow u10 (/ (- loser-rating winner-rating) u400)))))
        ;; Rating change for winner
        (winner-change (/ (* RATING_K_FACTOR (- u100000 expected-winner)) u100000))
        ;; Rating change for loser (negative of winner change)
        (loser-change (- winner-change))
    )
    { winner-change: winner-change, loser-change: loser-change }
    )
)

;; Update player statistics after a game
(define-private (update-player-stats (winner principal) (loser principal) (is-draw bool))
    (let (
        ;; Get current stats for both players
        (winner-stats (init-player-stats winner))
        (loser-stats (init-player-stats loser))
        ;; Calculate rating changes
        (rating-changes (if is-draw
            { winner-change: u0, loser-change: u0 } ;; No rating change for draws
            (calculate-rating-change (get rating winner-stats) (get rating loser-stats))))
        ;; Update winner stats
        (new-winner-stats (if is-draw
            (merge winner-stats {
                draws: (+ (get draws winner-stats) u1),
                games-played: (+ (get games-played winner-stats) u1),
                last-game-block: stacks-block-height
            })
            (merge winner-stats {
                wins: (+ (get wins winner-stats) u1),
                rating: (+ (get rating winner-stats) (get winner-change rating-changes)),
                games-played: (+ (get games-played winner-stats) u1),
                last-game-block: stacks-block-height
            })))
        ;; Update loser stats
        (new-loser-stats (if is-draw
            (merge loser-stats {
                draws: (+ (get draws loser-stats) u1),
                games-played: (+ (get games-played loser-stats) u1),
                last-game-block: stacks-block-height
            })
            (merge loser-stats {
                losses: (+ (get losses loser-stats) u1),
                rating: (if (> (get rating loser-stats) (get loser-change rating-changes))
                    (- (get rating loser-stats) (get loser-change rating-changes))
                    u800), ;; Minimum rating floor
                games-played: (+ (get games-played loser-stats) u1),
                last-game-block: stacks-block-height
            })))
    )
    ;; Update both players' stats in the map
    (map-set player-stats winner new-winner-stats)
    (map-set player-stats loser new-loser-stats)
    true
    )
)

;; Join the matchmaking queue
(define-public (join-queue (bet-amount uint))
    (let (
        ;; Get player stats to include rating in queue
        (player-data (init-player-stats contract-caller))
        ;; Create queue entry
        (queue-entry {
            bet-amount: bet-amount,
            join-time: stacks-block-height,
            rating: (get rating player-data)
        })
        ;; Current queue list
        (current-queue (var-get queue-list))
    )
    ;; Ensure minimum bet amount
    (asserts! (> bet-amount u0) (err ERR_MIN_BET_AMOUNT))
    ;; Ensure player is not already in queue
    (asserts! (is-none (map-get? queue-players contract-caller)) (err ERR_ALREADY_IN_QUEUE))
    ;; Ensure queue is not full
    (asserts! (< (var-get queue-size) u50) (err ERR_GAME_CANNOT_BE_JOINED))

    ;; Add player to queue map
    (map-set queue-players contract-caller queue-entry)
    ;; Add player to queue list
    (var-set queue-list (unwrap! (as-max-len? (append current-queue contract-caller) u50) (err ERR_GAME_CANNOT_BE_JOINED)))
    ;; Increment queue size
    (var-set queue-size (+ (var-get queue-size) u1))

    ;; Initialize player stats if they don't exist
    (map-set player-stats contract-caller player-data)

    ;; Log queue join
    (print { action: "join-queue", player: contract-caller, bet-amount: bet-amount, rating: (get rating player-data) })
    
    (ok true)
    )
)

;; Leave the matchmaking queue
(define-public (leave-queue)
    (let (
        ;; Current queue list
        (current-queue (var-get queue-list))
        ;; Filter out the leaving player
        (new-queue (filter is-not-caller current-queue))
    )
    ;; Ensure player is in queue
    (asserts! (is-some (map-get? queue-players contract-caller)) (err ERR_NOT_IN_QUEUE))

    ;; Remove player from queue map
    (map-delete queue-players contract-caller)
    ;; Update queue list
    (var-set queue-list new-queue)
    ;; Decrement queue size
    (var-set queue-size (- (var-get queue-size) u1))

    ;; Log queue leave
    (print { action: "leave-queue", player: contract-caller })
    
    (ok true)
    )
)

;; Helper function for filtering queue
(define-private (is-not-caller (player principal))
    (not (is-eq player contract-caller))
)

;; Find and match players in queue
(define-public (find-match)
    (let (
        ;; Current queue list
        (current-queue (var-get queue-list))
        ;; Get first two players if available
        (player-one-opt (element-at? current-queue u0))
        (player-two-opt (element-at? current-queue u1))
    )
    ;; Ensure we have at least 2 players in queue
    (asserts! (>= (var-get queue-size) u2) (err ERR_NO_OPPONENT_FOUND))
    
    (match player-one-opt
        player-one (match player-two-opt
            player-two (match (map-get? queue-players player-one)
                p1-data (match (map-get? queue-players player-two)
                    p2-data (let (
                        ;; Ensure both players have same bet amount (for fair matching)
                        (bet-amount (get bet-amount p1-data))
                        ;; Remove both players from queue
                        (updated-queue (slice? current-queue u2 (len current-queue)))
                    )
                    ;; Check if bet amounts match
                    (asserts! (is-eq bet-amount (get bet-amount p2-data)) (err ERR_NO_OPPONENT_FOUND))
                    
                    ;; Create matched game
                    (let ((game-id (unwrap! (create-matched-game player-one player-two bet-amount) (err ERR_GAME_NOT_FOUND))))
                        ;; Update queue
                        (var-set queue-list (default-to (list) updated-queue))
                        (var-set queue-size (- (var-get queue-size) u2))
                        ;; Remove players from queue map
                        (map-delete queue-players player-one)
                        (map-delete queue-players player-two)
                        ;; Log successful match
                        (print { 
                            action: "match-found", 
                            game-id: game-id,
                            player-one: player-one, 
                            player-two: player-two,
                            bet-amount: bet-amount
                        })
                        (ok game-id)
                    ))
                    (err ERR_NO_OPPONENT_FOUND))
                (err ERR_NO_OPPONENT_FOUND))
            (err ERR_NO_OPPONENT_FOUND))
        (err ERR_NO_OPPONENT_FOUND))
    )
)

;; Create a matched game automatically (internal function)
(define-private (create-matched-game (player-one principal) (player-two principal) (bet-amount uint))
    (let (
        ;; Get the Game ID to use for creation of this new game
        (game-id (var-get latest-game-id))
        ;; Empty starting board
        (starting-board (list u0 u0 u0 u0 u0 u0 u0 u0 u0))
        ;; Create the game data tuple
        (game-data {
            player-one: player-one,
            player-two: (some player-two),
            is-player-one-turn: true,
            bet-amount: bet-amount,
            board: starting-board,
            winner: none,
            is-draw: false,
            draw-resolved: false,
            last-move-block: stacks-block-height
        })
    )

    ;; No need for STX transfer here - players transfer when they join queue or make first move
    ;; Update the games map with the new game data
    (map-set games game-id game-data)
    ;; Increment the Game ID counter
    (var-set latest-game-id (+ game-id u1))

    ;; Return the Game ID of the new game
    (ok game-id)
    )
)

;; Enhanced play function that updates stats when game ends
(define-public (play-with-stats (game-id uint) (move-index uint) (move uint))
    (let (
        ;; Load the game data for the game being played
        (original-game-data (unwrap! (map-get? games game-id) (err ERR_GAME_NOT_FOUND)))
        ;; Get the original board from the game data
        (original-board (get board original-game-data))

        ;; Is it player one's turn?
        (is-player-one-turn (get is-player-one-turn original-game-data))
        ;; Get the player whose turn it currently is based on the is-player-one-turn flag
        (player-turn (if is-player-one-turn (get player-one original-game-data) (unwrap! (get player-two original-game-data) (err ERR_GAME_NOT_FOUND))))
        ;; Get the expected move based on whose turn it is (X or O?)
        (expected-move (if is-player-one-turn u1 u2))

        ;; Update the game board by placing the player's move at the specified index
        (game-board (unwrap! (replace-at? original-board move-index move) (err ERR_INVALID_MOVE)))
        ;; Check if the game has been won now with this modified board
        (is-now-winner (has-won game-board))
        ;; Check if the board is full (draw condition)
        (is-board-full (is-eq (len (filter is-empty-cell game-board)) u0))
        ;; Determine if it's a draw
        (is-draw (and (not is-now-winner) is-board-full))
        ;; Merge the game data with the updated board
        (game-data (merge original-game-data {
            board: game-board,
            is-player-one-turn: (not is-player-one-turn),
            winner: (if is-now-winner (some player-turn) none),
            is-draw: is-draw,
            last-move-block: stacks-block-height
        }))
        ;; Get both players
        (player-one (get player-one original-game-data))
        (player-two (unwrap! (get player-two original-game-data) (err ERR_GAME_NOT_FOUND)))
    )

    ;; Ensure that the function is being called by the player whose turn it is
    (asserts! (is-eq player-turn contract-caller) (err ERR_NOT_YOUR_TURN))
    ;; Ensure that the move being played is the correct move based on the current turn (X or O)
    (asserts! (is-eq move expected-move) (err ERR_INVALID_MOVE))
    ;; Ensure that the move meets validity requirements
    (asserts! (validate-move original-board move-index move) (err ERR_INVALID_MOVE))

    ;; Transfer STX from players for their first moves if not already transferred
    (if (and is-player-one-turn (is-eq (len (filter is-not-empty-cell original-board)) u0))
        (try! (stx-transfer? (get bet-amount game-data) contract-caller THIS_CONTRACT))
        false)
    
    (if (and (not is-player-one-turn) (is-eq (len (filter is-not-empty-cell original-board)) u1))
        (try! (stx-transfer? (get bet-amount game-data) contract-caller THIS_CONTRACT))
        false)

    ;; If the game has ended (won or draw), handle payouts and update stats
    (if (or is-now-winner is-draw)
        (begin
            ;; Handle payouts
            (if is-now-winner
                ;; Winner takes all
                (try! (as-contract (stx-transfer? (* u2 (get bet-amount game-data)) tx-sender player-turn)))
                ;; Draw - return bets to both players
                (begin
                    (try! (as-contract (stx-transfer? (get bet-amount game-data) tx-sender player-one)))
                    (try! (as-contract (stx-transfer? (get bet-amount game-data) tx-sender player-two)))
                )
            )
            ;; Update player statistics
            (if is-draw
                (update-player-stats player-one player-two true)
                (if (is-eq player-turn player-one)
                    (update-player-stats player-one player-two false)
                    (update-player-stats player-two player-one false)
                )
            )
        )
        false
    )

    ;; Update the games map with the new game data
    (map-set games game-id game-data)

    ;; Log the action of a move being made
    (print {action: "play-with-stats", data: game-data})
    ;; Return the Game ID of the game
    (ok game-id)
    )
)

;; Helper functions for board analysis
(define-private (is-empty-cell (cell uint))
    (is-eq cell u0)
)

(define-private (is-not-empty-cell (cell uint))
    (not (is-eq cell u0))
)

;; Quit a drawn game and claim back stakes
(define-public (quit-draw (game-id uint))
    (let (
        ;; Load the game data
        (game-data (unwrap! (map-get? games game-id) (err ERR_GAME_NOT_FOUND)))
        ;; Get both players
        (player-one (get player-one game-data))
        (player-two (unwrap! (get player-two game-data) (err ERR_GAME_NOT_FOUND)))
        ;; Updated game data marking draw as resolved
        (resolved-game-data (merge game-data {
            draw-resolved: true
        }))
    )
    ;; Ensure the game is actually drawn
    (asserts! (get is-draw game-data) (err ERR_GAME_NOT_DRAWN))
    ;; Ensure draw hasn't been resolved yet
    (asserts! (not (get draw-resolved game-data)) (err ERR_GAME_NOT_FOUND))
    ;; Ensure caller is one of the players
    (asserts! (or (is-eq contract-caller player-one) (is-eq contract-caller player-two)) (err ERR_NOT_PLAYER))

    ;; Return stakes to both players
    (try! (as-contract (stx-transfer? (get bet-amount game-data) tx-sender player-one)))
    (try! (as-contract (stx-transfer? (get bet-amount game-data) tx-sender player-two)))

    ;; Update the game to mark draw as resolved
    (map-set games game-id resolved-game-data)

    ;; Log the quit action
    (print { action: "quit-draw", game-id: game-id, player: contract-caller })
    
    (ok true)
    )
)

;; Rematch - create a new game between the same players with same bet amount
(define-public (rematch (game-id uint))
    (let (
        ;; Load the original game data
        (original-game (unwrap! (map-get? games game-id) (err ERR_GAME_NOT_FOUND)))
        ;; Get both players
        (player-one (get player-one original-game))
        (player-two (unwrap! (get player-two original-game) (err ERR_GAME_NOT_FOUND)))
        ;; Get the bet amount from original game
        (bet-amount (get bet-amount original-game))
        ;; Get new game ID
        (new-game-id (var-get latest-game-id))
        ;; Create new game data with empty board
        (new-game-data {
            player-one: player-one,
            player-two: (some player-two),
            is-player-one-turn: true,
            bet-amount: bet-amount,
            board: (list u0 u0 u0 u0 u0 u0 u0 u0 u0),
            winner: none,
            is-draw: false,
            draw-resolved: false,
            last-move-block: stacks-block-height
        })
        ;; Mark original draw as resolved
        (resolved-original (merge original-game {
            draw-resolved: true
        }))
    )
    ;; Ensure the original game is actually drawn
    (asserts! (get is-draw original-game) (err ERR_GAME_NOT_DRAWN))
    ;; Ensure draw hasn't been resolved yet
    (asserts! (not (get draw-resolved original-game)) (err ERR_GAME_NOT_FOUND))
    ;; Ensure caller is one of the players
    (asserts! (or (is-eq contract-caller player-one) (is-eq contract-caller player-two)) (err ERR_NOT_PLAYER))

    ;; Players must deposit stakes for the new game
    (try! (stx-transfer? bet-amount player-one THIS_CONTRACT))
    (try! (stx-transfer? bet-amount player-two THIS_CONTRACT))

    ;; Update original game to mark as resolved
    (map-set games game-id resolved-original)
    ;; Create the new game
    (map-set games new-game-id new-game-data)
    ;; Increment game ID counter
    (var-set latest-game-id (+ new-game-id u1))

    ;; Log the rematch action
    (print { 
        action: "rematch", 
        original-game-id: game-id, 
        new-game-id: new-game-id,
        player-one: player-one,
        player-two: player-two,
        bet-amount: bet-amount
    })
    
    ;; Return the new game ID
    (ok new-game-id)
    )
)

(define-read-only (get-game (game-id uint))
    (map-get? games game-id)
)

(define-read-only (get-latest-game-id)
    (var-get latest-game-id)
)

(define-read-only (get-player-stats (player principal))
    (map-get? player-stats player)
)

(define-read-only (get-queue-status)
    {
        queue-size: (var-get queue-size),
        queue-players: (var-get queue-list)
    }
)

(define-read-only (get-player-queue-info (player principal))
    (map-get? queue-players player)
)

;; Get top players by rating (limited implementation for Clarity)
(define-read-only (get-leaderboard)
    (let (
        ;; This is a simplified version - in a full implementation you'd want
        ;; to maintain a sorted list of players by rating
        (current-queue-list (var-get queue-list))
    )
    ;; Return current queue as a simple leaderboard for now
    ;; In production, you'd want a more sophisticated ranking system
    current-queue-list
    )
)