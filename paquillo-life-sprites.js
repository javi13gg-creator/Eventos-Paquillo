/* MiniJavi sin gafas · nueve poses del mismo personaje, con arte 3D cartoon.
 * Hoja de sprites: paquillo-life-minijavi-sprites.png (3 columnas x 3 filas).
 * Sólo disponible en el hogar privado de Javi. No altera avatares aprobados. */
(()=>{
 'use strict';
 function isJavi(name){return String(name||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()==='javi'}
 function create(name){
  if(!isJavi(name))return null;
  const character=document.createElement('div');
  character.className='pl-sprite-character';
  character.setAttribute('role','img');
  character.setAttribute('aria-label','MiniJavi sin gafas con nueve poses ilustradas');
  character.setAttribute('data-pl-sprite-sheet','paquillo-life-minijavi-sprites.png');
  return character;
 }
 window.PaquilloLifeSprite={create,isPilot:isJavi};
})();