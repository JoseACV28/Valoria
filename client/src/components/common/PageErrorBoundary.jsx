import {ActivityState} from './ActivityState';
import { ui } from "../../i18n/runtime.js";
import { Component } from 'react';
export class PageErrorBoundary extends Component {
  state={error:false};
  static getDerivedStateFromError(){return {error:true};}
  componentDidCatch(error){console.error('No se pudo mostrar la página',error);}
  render(){return this.state.error?<main style={{margin:'10vh auto',maxWidth:600,padding:24}}><ActivityState kind="error" title="No se pudo mostrar esta página" message="Tu contenido guardado se conserva. Recarga para volver a intentarlo." action="Recargar página" onAction={()=>window.location.reload()}/><a href="#/" onClick={()=>this.setState({error:false})}>{ui("Ir al inicio")}</a></main>:this.props.children;}
}
