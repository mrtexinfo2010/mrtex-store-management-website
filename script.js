/* ---- Login & Session Guard ---- */
(function initAuth(){
  const overlay=$('#login-overlay'),wrap=$('#appWrap'),pass=$('#loginPass'),errBox=$('#login-error'),card=$('#loginCard'),toggle=$('#togglePass');
  
  function unlock(){
    overlay.style.opacity='0';
    overlay.style.transition='opacity 0.3s ease';
    setTimeout(()=>{
      overlay.style.display='none';
      overlay.style.opacity='1';
      wrap.style.display='block';
      startApp();
    },250);
  }

  function tryLogin(){
    if(pass.value===APP_PASSWORD){
      sessionStorage.setItem('mrtex_auth','1');
      errBox.textContent='';
      pass.value='';
      unlock();
    }else{
      errBox.textContent='Incorrect password! Please try again.';
      card.classList.remove('shake');
      void card.offsetWidth; // trigger reflow for restart animation
      card.classList.add('shake');
      pass.focus();
    }
  }

  // Show/Hide Password Eye Toggle
  if(toggle){
    toggle.addEventListener('click',()=>{
      const isPass=pass.type==='password';
      pass.type=isPass?'text':'password';
      toggle.textContent=isPass?'🙈':'👁️';
      pass.focus();
    });
  }

  if(sessionStorage.getItem('mrtex_auth')==='1'){
    overlay.style.display='none';
    wrap.style.display='block';
    startApp();
  }else{
    pass.focus();
  }

  $('#loginBtn').addEventListener('click',tryLogin);
  pass.addEventListener('keydown',e=>{if(e.key==='Enter')tryLogin()});
  $('#logoutBtn').addEventListener('click',()=>{
    sessionStorage.removeItem('mrtex_auth');
    wrap.style.display='none';
    overlay.style.display='flex';
    pass.type='password';
    if(toggle)toggle.textContent='👁️';
    pass.focus();
  });
})();
