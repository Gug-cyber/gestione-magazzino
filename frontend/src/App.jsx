import React from 'react';

// Other imports

function App() {
  // Other code...

  // This is where the intentional error is thrown
  throw new Error('Intentional test error to trigger auto-fix workflow');

  // Rest of the component code...
}

export default App;