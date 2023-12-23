import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import cn from 'classnames';
import { Todo } from '../../types/Todo';
import {
  getTodos,
  addTodo,
  deleteTodo,
  editTodo,
} from '../../api/todos';
import { useAuth } from '../../Context/Context';
import { TodoItem } from '../TodoItem';
import { Filter } from '../Filter';
import { filteredData } from '../../helpers/filteredData';
import { FilterBy, ErrorMessage, EditField } from '../../types/types';
import { Error } from '../Error';

export const TodoAppContent: React.FC = () => {
  const userId = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoField, setNewTodoField] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [todosCount, setTodosCount] = useState(0);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [loadTodosIds, setLoadTodosIds] = useState<number[]>([]);
  const [filterBy, setFilterBy] = useState<FilterBy>(FilterBy.All);
  const [disabledClear, setDisabledClear] = useState(true);
  const [errorMessage, setErrorMessage] = useState<ErrorMessage | null>(null);
  const currentTodos = filteredData<Todo>(todos, filterBy);

  const inputRef = useRef<HTMLInputElement>(null);

  const countOfNotCompleted = todos
    .filter(({ completed }) => !completed);

  const countOfCompleted = todos.filter(({ completed }) => completed);

  useEffect(() => {
    if (userId) {
      getTodos(userId)
        .then((resp) => {
          setTodos(resp);
        })
        .catch(() => setErrorMessage(ErrorMessage.Load));
    }
  }, [userId]);

  useEffect(() => {
    setTodosCount(countOfNotCompleted.length);
  }, [todos]);

  useEffect(() => {
    if (!isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  useMemo(() => {
    setDisabledClear(!todos.some(({ completed }) => completed));
  }, [todos]);

  const handleAddTodo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (userId) {
      if (!newTodoField.trim()) {
        setErrorMessage(ErrorMessage.NotBeEmpty);

        return;
      }

      const body = {
        id: 0,
        title: newTodoField.replace(/\s+/g, ' ').trim(),
        userId,
        completed: false,
      };

      setIsAdding(true);
      setTempTodo(body);

      addTodo(body)
        .then(resp => {
          setTodos(prev => [...prev, resp]);
          setNewTodoField('');
        })
        .catch(() => {
          setErrorMessage(ErrorMessage.Add);
        })
        .finally(() => {
          setTempTodo(null);
          setIsAdding(false);
        });
    }
  };

  const handleDeleteTodo = (idToDel: number) => {
    setLoadTodosIds(prev => [...prev, idToDel]);

    deleteTodo(idToDel)
      .then(() => {
        setTodos(prev => prev.filter(({ id }) => id !== idToDel));
      })
      .catch(() => {
        setErrorMessage(ErrorMessage.Delete);
      })
      .finally(() => {
        setLoadTodosIds(prev => prev.filter(i => i !== idToDel));
      });
  };

  const handleEditTodo = (id: number, field: EditField) => {
    const index = todos.findIndex(todo => todo.id === id);

    setLoadTodosIds(prev => [...prev, id]);

    editTodo(id, field)
      .then(resp => {
        setTodos(prev => prev.map((el, i) => {
          if (index === i) {
            return resp;
          }

          return el;
        }));
      })
      .catch(() => {
        setErrorMessage(ErrorMessage.Update);
      })
      .finally(() => {
        setLoadTodosIds(prev => prev.filter(i => i !== id));
      });
  };

  const handleToggleAll = () => {
    const completedsTodos = (todosCount === 0);
    const todosToToggle = completedsTodos
      ? countOfCompleted
      : countOfNotCompleted;

    const arg = {
      completed: !completedsTodos,
    };

    todosToToggle.forEach(({ id }) => handleEditTodo(id, arg));
  };

  const handleClearCompleted = () => {
    todos.forEach(({ id, completed }) => {
      if (completed) {
        handleDeleteTodo(id);
      }
    });
  };

  return (
    <>
      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={cn(
              'todoapp__toggle-all',
              { active: todosCount === 0 },
            )}
            data-cy="ToggleAllButton"
            aria-label="toggle all button"
            onClick={handleToggleAll}
          />

          <form onSubmit={handleAddTodo}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              onChange={e => setNewTodoField(e.target.value)}
              value={newTodoField}
              disabled={isAdding}
              ref={inputRef}
            />
          </form>
        </header>

        {((currentTodos.length > 0) || isAdding) && (
          <>
            <section className="todoapp__main" data-cy="TodoList">
              {currentTodos.map(todo => (
                <TodoItem
                  todo={todo}
                  onDelete={handleDeleteTodo}
                  onEdit={handleEditTodo}
                  isLoading={loadTodosIds.includes(todo.id)}
                  key={todo.id}
                />
              ))}

              {tempTodo && (
                <TodoItem
                  todo={tempTodo}
                  isLoading
                />
              )}
            </section>

            <footer className="todoapp__footer" data-cy="Footer">
              <span className="todo-count" data-cy="TodosCounter">
                {`${todosCount} items left`}
              </span>

              <Filter getFilter={setFilterBy} />

              <button
                type="button"
                className="todoapp__clear-completed"
                data-cy="ClearCompletedButton"
                onClick={handleClearCompleted}
                disabled={disabledClear}
              >
                Clear completed
              </button>
            </footer>
          </>
        )}
      </div>

      <Error
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
      />
    </>
  );
};
