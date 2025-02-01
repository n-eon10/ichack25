import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Map from './pages/map'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <BrowserRouter>
        <div className='App'>
          <Routes>
              <Route 
                path = "/map" 
                element={<Map />}
              />
          </Routes>
        </div>
      </BrowserRouter>
    </>
  )
}

export default App
