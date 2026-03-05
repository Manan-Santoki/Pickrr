import * as React from 'react';

type UpdateState = {
  checking: boolean;
  needsUpdate: boolean;
  message: string;
};

export function useMandatoryUpdateCheck(): UpdateState {
  const [state, setState] = React.useState<UpdateState>({
    checking: true,
    needsUpdate: false,
    message: '',
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setState({
        checking: false,
        needsUpdate: false,
        message: '',
      });
    }, 280);

    return () => clearTimeout(timer);
  }, []);

  return state;
}
