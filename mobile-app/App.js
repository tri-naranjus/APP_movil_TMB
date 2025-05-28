import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function App() {
  const [userData, setUserData] = useState({
    nombre: '',
    edad: '',
    peso: '',
    altura: '',
    genero: 'masculino',
    nivelActividad: 'sedentario',
    objetivo: 'mantener'
  });

  const [tmb, setTmb] = useState(null);
  const [calorias, setCalorias] = useState(null);
  const [planNutricional, setPlanNutricional] = useState(null);
  const [historialPeso, setHistorialPeso] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const guardarDatos = async (datos) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(datos));
      
      if (datos.peso) {
        const nuevoRegistro = {
          fecha: new Date().toISOString(),
          peso: parseFloat(datos.peso)
        };
        
        const historialActual = await AsyncStorage.getItem('historialPeso');
        let historial = historialActual ? JSON.parse(historialActual) : [];
        historial.push(nuevoRegistro);
        
        if (historial.length > 30) {
          historial = historial.slice(-30);
        }
        
        await AsyncStorage.setItem('historialPeso', JSON.stringify(historial));
        setHistorialPeso(historial);
      }
    } catch (error) {
      console.error('Error guardando datos:', error);
    }
  };

  const cargarDatos = async () => {
    try {
      const datosGuardados = await AsyncStorage.getItem('userData');
      const historialGuardado = await AsyncStorage.getItem('historialPeso');
      
      if (datosGuardados) {
        const datos = JSON.parse(datosGuardados);
        setUserData(datos);
        setEditando(false);
        calcularTMB(datos);
      }
      
      if (historialGuardado) {
        setHistorialPeso(JSON.parse(historialGuardado));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const calcularTMB = (datos = userData) => {
    const { edad, peso, altura, genero } = datos;
    
    if (!edad || !peso || !altura) return;
    
    let tmbCalculado;
    
    if (genero === 'masculino') {
      tmbCalculado = 88.362 + (13.397 * parseFloat(peso)) + (4.799 * parseFloat(altura)) - (5.677 * parseFloat(edad));
    } else {
      tmbCalculado = 447.593 + (9.247 * parseFloat(peso)) + (3.098 * parseFloat(altura)) - (4.330 * parseFloat(edad));
    }
    
    setTmb(Math.round(tmbCalculado));
    calcularCalorias(tmbCalculado, datos.nivelActividad, datos.objetivo);
  };

  const calcularCalorias = (tmbBase, actividad, objetivo) => {
    const factoresActividad = {
      sedentario: 1.2,
      ligero: 1.375,
      moderado: 1.55,
      activo: 1.725,
      muyActivo: 1.9
    };
    
    let caloriasDiarias = tmbBase * factoresActividad[actividad];
    
    switch (objetivo) {
      case 'perder':
        caloriasDiarias *= 0.85;
        break;
      case 'ganar':
        caloriasDiarias *= 1.15;
        break;
    }
    
    setCalorias(Math.round(caloriasDiarias));
  };

  const generarPlanNutricional = async () => {
    setCargando(true);
    try {
      // IMPORTANTE: Cambia esta URL por la de tu API en Vercel
      const response = await fetch('https://app-movil-tmb-git-main-tri-naranjus-projects.vercel.app/api/generarPlan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          tmb,
          calorias
        })
      });
      
      const data = await response.json();
      setPlanNutricional(data.plan);
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el plan nutricional');
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = () => {
    if (!userData.nombre || !userData.edad || !userData.peso || !userData.altura) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    
    guardarDatos(userData);
    calcularTMB();
    setEditando(false);
    Alert.alert('Éxito', 'Datos guardados correctamente');
  };

  const prepararDatosGrafico = () => {
    if (historialPeso.length === 0) return null;
    
    const ultimos7Dias = historialPeso.slice(-7);
    
    return {
      labels: ultimos7Dias.map(item => {
        const fecha = new Date(item.fecha);
        return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
      }),
      datasets: [{
        data: ultimos7Dias.map(item => item.peso)
      }]
    };
  };

  const EditIcon = () => (
    <Text style={styles.iconText}>✏️</Text>
  );

  const ChartIcon = () => (
    <Text style={styles.iconText}>📊</Text>
  );

  const FoodIcon = () => (
    <Text style={styles.iconText}>🍽️</Text>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.titulo}>Calculadora TMB</Text>
            {!editando && (
              <TouchableOpacity onPress={() => setEditando(true)}>
                <EditIcon />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.formulario}>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              value={userData.nombre}
              onChangeText={(text) => setUserData({...userData, nombre: text})}
              editable={editando}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Edad"
              value={userData.edad}
              onChangeText={(text) => setUserData({...userData, edad: text})}
              keyboardType="numeric"
              editable={editando}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Peso (kg)"
              value={userData.peso}
              onChangeText={(text) => setUserData({...userData, peso: text})}
              keyboardType="decimal-pad"
              editable={editando}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Altura (cm)"
              value={userData.altura}
              onChangeText={(text) => setUserData({...userData, altura: text})}
              keyboardType="numeric"
              editable={editando}
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Género:</Text>
              <Picker
                selectedValue={userData.genero}
                onValueChange={(value) => setUserData({...userData, genero: value})}
                enabled={editando}
                style={styles.picker}
              >
                <Picker.Item label="Masculino" value="masculino" />
                <Picker.Item label="Femenino" value="femenino" />
              </Picker>
            </View>
            
            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Nivel de Actividad:</Text>
              <Picker
                selectedValue={userData.nivelActividad}
                onValueChange={(value) => setUserData({...userData, nivelActividad: value})}
                enabled={editando}
                style={styles.picker}
              >
                <Picker.Item label="Sedentario" value="sedentario" />
                <Picker.Item label="Actividad Ligera" value="ligero" />
                <Picker.Item label="Actividad Moderada" value="moderado" />
                <Picker.Item label="Muy Activo" value="activo" />
                <Picker.Item label="Extremadamente Activo" value="muyActivo" />
              </Picker>
            </View>
            
            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Objetivo:</Text>
              <Picker
                selectedValue={userData.objetivo}
                onValueChange={(value) => setUserData({...userData, objetivo: value})}
                enabled={editando}
                style={styles.picker}
              >
                <Picker.Item label="Perder Peso" value="perder" />
                <Picker.Item label="Mantener Peso" value="mantener" />
                <Picker.Item label="Ganar Peso" value="ganar" />
              </Picker>
            </View>
          </View>

          {editando && (
            <TouchableOpacity style={styles.boton} onPress={handleGuardar}>
              <Text style={styles.botonTexto}>Guardar y Calcular</Text>
            </TouchableOpacity>
          )}

          {tmb && !editando && (
            <View style={styles.resultados}>
              <Text style={styles.resultadoTitulo}>Resultados:</Text>
              <Text style={styles.resultadoTexto}>TMB: {tmb} kcal/día</Text>
              <Text style={styles.resultadoTexto}>Calorías diarias: {calorias} kcal/día</Text>
              
              <TouchableOpacity 
                style={styles.botonSecundario} 
                onPress={() => setMostrarHistorial(true)}
              >
                <ChartIcon />
                <Text style={styles.botonSecundarioTexto}>Ver Progreso de Peso</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.botonSecundario} 
                onPress={generarPlanNutricional}
                disabled={cargando}
              >
                {cargando ? (
                  <ActivityIndicator color="#4A90E2" />
                ) : (
                  <>
                    <FoodIcon />
                    <Text style={styles.botonSecundarioTexto}>Generar Plan Nutricional</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {planNutricional && (
            <View style={styles.planNutricional}>
              <Text style={styles.planTitulo}>Plan Nutricional Personalizado</Text>
              <Text style={styles.planTexto}>{planNutricional}</Text>
            </View>
          )}

          <Modal
            animationType="slide"
            transparent={true}
            visible={mostrarHistorial}
            onRequestClose={() => setMostrarHistorial(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitulo}>Progreso de Peso</Text>
                  <TouchableOpacity onPress={() => setMostrarHistorial(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                {prepararDatosGrafico() && historialPeso.length > 1 ? (
                  <LineChart
                    data={prepararDatosGrafico()}
                    width={width - 60}
                    height={220}
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: {
                        borderRadius: 16
                      },
                      propsForDots: {
                        r: "6",
                        strokeWidth: "2",
                        stroke: "#4A90E2"
                      }
                    }}
                    bezier
                    style={{
                      marginVertical: 8,
                      borderRadius: 16
                    }}
                  />
                ) : (
                  <Text style={styles.noDataText}>
                    {historialPeso.length === 0 
                      ? "No hay datos de peso registrados"
                      : "Necesitas al menos 2 registros para ver el gráfico"}
                  </Text>
                )}
              </View>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  iconText: {
    fontSize: 24,
  },
  formulario: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    height: 50,
  },
  boton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultados: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultadoTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultadoTexto: {
    fontSize: 18,
    marginBottom: 8,
    color: '#555',
  },
  botonSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderRadius: 8,
    marginTop: 10,
  },
  botonSecundarioTexto: {
    color: '#4A90E2',
    fontSize: 16,
    marginLeft: 8,
  },
  planNutricional: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  planTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  planTexto: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: width - 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginVertical: 40,
  },
});
