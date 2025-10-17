Currently, a player who is losing can choose to play unfairly by refusing to make their next move. By doing so, the game gets stuck in a state of limbo, never concluding, and both players' bet money remains locked up in the contract.

To solve this, we can implement a timeout mechanism that allows the opposing player to cancel the game and withdraw their funds if the other player doesn't make a move within a specified time frame.

Update the game data tuple to include a timestamp of the last time a move was played

If a move isn't played within a certain threshold amount of time, for example 5 minutes, allow the opposing player to cancel the game and withdraw funds back out