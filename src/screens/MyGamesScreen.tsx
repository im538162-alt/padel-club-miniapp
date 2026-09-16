import { GameCard } from '../components/GameCard'
import { StateNotice } from '../components/StateNotice'
import { useAppContext } from '../state/context'

export function MyGamesScreen() {
  const { myGames, myGamesLoading, myGamesError, reloadMyGames } = useAppContext()

  const upcoming = myGames.filter((game) => game.isUpcoming)
  const past = myGames.filter((game) => !game.isUpcoming).slice().reverse()

  return (
    <div className="screen">
      <h1 className="screen__title">Мои игры</h1>

      {myGamesLoading && <StateNotice kind="loading" title="Загружаем ваши игры…" />}

      {!myGamesLoading && myGamesError && (
        <StateNotice
          kind="error"
          title="Не удалось загрузить игры"
          description={myGamesError}
          onRetry={reloadMyGames}
        />
      )}

      {!myGamesLoading && !myGamesError && (
        <>
          <div className="section-title">Ближайшие</div>
          {upcoming.length === 0 ? (
            <p className="empty-state">Нет предстоящих игр. Забронируйте корт на «Главной»!</p>
          ) : (
            <div className="game-list">
              {upcoming.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}

          <div className="section-title">Прошедшие</div>
          {past.length === 0 ? (
            <p className="empty-state">Прошедших игр пока нет</p>
          ) : (
            <div className="game-list">
              {past.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
