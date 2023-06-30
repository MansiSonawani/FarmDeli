import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import Logo from "../src/images/logo-r.png";

function App() {


  return (
    <div className="App">
     
    
      <nav>
  <div class="navbar">
    <img class="logo" src={Logo} alt="Logo"></img>
    <ul class="nav-links">
      <li><a href="#">Home</a></li>
      <li><a href="#">Shop</a></li>
      <li><a href="#">Categories</a></li>
      <li><a href="#">Cart</a></li>
      <li><a href="#">Account</a></li>
    </ul>
  </div>
</nav>
</div>
    
    
  )
}

export default App
